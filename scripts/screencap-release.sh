#!/bin/bash
# Build, sign, notarize and publish a Screencap Mac release to GitHub Releases on ques123/screencap-web.
#   scripts/screencap-release.sh [--targets "aarch64-apple-darwin x86_64-apple-darwin"] [--skip-build] [--draft]
# Local requirements (never committed): the Developer ID identity in the login keychain, the App Store
# Connect API key in ~/.appstoreconnect, and the updater key in ~/.tauri. See scripts/screencap-build-env.sh.
# The version comes from apps/desktop/src-tauri/Cargo.toml; bump it before releasing.
#
# Tauri only signs here. This script notarizes, because Tauri waits on notarytool --wait, which gives up
# on one network hiccup and then never produces the DMG (and a team's first submissions can take hours):
#   1. per target: build (or reuse the build with --skip-build), bundle the app, make the DMG with
#      dmgbuild (no Finder scripting, so it works on a locked Mac), sign the DMG, submit it
#   2. per target: poll until Apple accepts, staple the DMG and the app, then pack and sign the updater
#      archive from the stapled app
#   3. write latest.json and publish the GitHub release
set -euo pipefail
cd "$(dirname "$0")/.."
TARGETS="aarch64-apple-darwin x86_64-apple-darwin"; SKIP_BUILD=0; DRAFT=""
while [ $# -gt 0 ]; do case "$1" in
  --targets) TARGETS="$2"; shift 2 ;; --skip-build) SKIP_BUILD=1; shift ;; --draft) DRAFT="--draft"; shift ;;
  *) echo "unknown option $1"; exit 2 ;; esac; done
[ -z "$(git status --porcelain -- apps crates packages Cargo.lock)" ] || { echo "uncommitted app changes; commit first"; exit 1; }
. scripts/screencap-build-env.sh
export PATH="$HOME/.bun/bin:$PATH"
VERSION=$(sed -n 's/^version = "\(.*\)"/\1/p' apps/desktop/src-tauri/Cargo.toml | head -1)
TAG="screencap-v$VERSION"; OUT="target/screencap-release/$VERSION"; mkdir -p "$OUT"
AUTH=(--key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER")
echo "Screencap $VERSION for: $TARGETS"

# dmgbuild (MIT, pinned) in a local venv, and the 1x/2x installer backgrounds it merges for Retina.
DMGBUILD=target/dmgbuild-venv/bin/dmgbuild
[ -x "$DMGBUILD" ] || { python3 -m venv target/dmgbuild-venv && target/dmgbuild-venv/bin/pip install -q dmgbuild==1.6.7; }
DMG_ASSETS=target/screencap-release/dmg-assets; mkdir -p "$DMG_ASSETS"
cp apps/desktop/src-tauri/assets/dmg-background.png "$DMG_ASSETS/background@2x.png"
sips -z 379 660 "$DMG_ASSETS/background@2x.png" --out "$DMG_ASSETS/background.png" >/dev/null

arch_of() { case "$1" in aarch64-apple-darwin) echo aarch64 ;; x86_64-apple-darwin) echo x64 ;; *) echo "bad target $1" >&2; exit 2 ;; esac; }
# Run Tauri without the notarization variables so it signs but does not notarize.
tauri_no_notary() { env -u APPLE_API_KEY -u APPLE_API_ISSUER -u APPLE_API_KEY_PATH "$@"; }

# Phase 1: build, bundle, sign and submit each DMG.
for T in $TARGETS; do
  A=$(arch_of "$T"); B="target/$T/release/bundle"; APP="$B/macos/Screencap.app"
  rm -rf "$B/macos"/*.tar.gz*
  # cap-setup reuses an extracted native-deps folder whatever its architecture, so clear it per target;
  # RUST_TARGET_TRIPLE must also reach tauri:build, or the sidecars are built for this Mac's CPU.
  rm -rf target/native-deps target/Frameworks
  export RUST_TARGET_TRIPLE=$T
  bun run cap-setup
  if [ $SKIP_BUILD = 0 ]; then
    tauri_no_notary bun run tauri:build -- --target "$T" --bundles app
  else
    # Re-bundle the binaries an earlier `tauri build` produced (no compile).
    (cd apps/desktop && tauri_no_notary bunx dotenv -e ../../.env -- bunx tauri bundle \
      --config src-tauri/tauri.prod.conf.json --target "$T" --bundles app)
  fi
  [ -d "$APP" ] || { echo "missing $APP"; exit 1; }
  codesign --verify --deep --strict "$APP"
  want=$([ "$A" = x64 ] && echo x86_64 || echo arm64)
  for f in "$APP/Contents/MacOS/"* "$APP/Contents/Frameworks/Spacedrive.framework/Libraries/"*.dylib; do
    [ -f "$f" ] || continue
    [ "$(lipo -archs "$f")" = "$want" ] || { echo "wrong architecture: $f"; exit 1; }
  done
  rm -f "$OUT/Screencap_$A.dmg"
  "$DMGBUILD" -s scripts/screencap-dmg-settings.py -D app="$APP" -D background="$DMG_ASSETS/background.png" \
    -D icon=apps/desktop/src-tauri/icons/macos/icon.icns Screencap "$OUT/Screencap_$A.dmg"
  codesign --force --sign "$APPLE_SIGNING_IDENTITY" --timestamp "$OUT/Screencap_$A.dmg"
  xcrun notarytool submit "$OUT/Screencap_$A.dmg" "${AUTH[@]}" --output-format json \
    | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])' > "$OUT/Screencap_$A.notary-id"
  echo "$A: DMG submitted for notarization ($(cat "$OUT/Screencap_$A.notary-id"))"
done

# Phase 2: wait for Apple, staple, pack the updater archive.
for T in $TARGETS; do
  A=$(arch_of "$T"); APP="target/$T/release/bundle/macos/Screencap.app"; ID=$(cat "$OUT/Screencap_$A.notary-id")
  while true; do
    status=$(xcrun notarytool info "$ID" "${AUTH[@]}" --output-format json 2>/dev/null \
      | python3 -c 'import sys,json;print(json.load(sys.stdin)["status"])' 2>/dev/null || echo "poll failed")
    case "$status" in
      Accepted) echo "$A: notarization accepted"; break ;;
      Invalid|Rejected) xcrun notarytool log "$ID" "${AUTH[@]}" || true; echo "$A: notarization $status"; exit 1 ;;
    esac
    echo "$(date -u +%H:%M) $A: $status"; sleep 60
  done
  xcrun stapler staple "$OUT/Screencap_$A.dmg"
  spctl --assess --type open --context context:primary-signature -v "$OUT/Screencap_$A.dmg"
  # The DMG's ticket covers the app inside it, so the app can be stapled too (needed only for offline
  # first launch; updates install without quarantine).
  xcrun stapler staple "$APP" || echo "$A: could not staple the app; continuing (Gatekeeper checks online)"
  COPYFILE_DISABLE=1 tar --no-mac-metadata --no-xattrs -czf "$OUT/Screencap_$A.app.tar.gz" -C "$(dirname "$APP")" Screencap.app
  rm -f "$OUT/Screencap_$A.app.tar.gz.sig"
  bunx tauri signer sign -f "$HOME/.tauri/screencap-updater.key" -p "$(cat "$HOME/.tauri/screencap-updater.password")" \
    "$OUT/Screencap_$A.app.tar.gz" >/dev/null
  [ -s "$OUT/Screencap_$A.app.tar.gz.sig" ] || { echo "$A: updater signature missing"; exit 1; }
done

# Phase 3: manifest and release.
python3 - "$OUT" "$VERSION" "$TAG" $TARGETS <<'PY'
import json, sys, pathlib, datetime
out, version, tag, targets = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4:]
base = f"https://github.com/ques123/screencap-web/releases/download/{tag}"
names = {"aarch64-apple-darwin": ("darwin-aarch64", "aarch64"), "x86_64-apple-darwin": ("darwin-x86_64", "x64")}
platforms = {}
for t in targets:
    plat, arch = names[t]
    platforms[plat] = {"signature": (out / f"Screencap_{arch}.app.tar.gz.sig").read_text().strip(),
                       "url": f"{base}/Screencap_{arch}.app.tar.gz"}
manifest = {"version": version, "notes": f"Screencap {version}",
            "pub_date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "platforms": platforms}
(out / "latest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print("latest.json:", version, sorted(platforms))
PY

FILES=$(ls "$OUT"/Screencap_*.dmg "$OUT"/Screencap_*.app.tar.gz "$OUT"/Screencap_*.app.tar.gz.sig "$OUT/latest.json")
if gh release view "$TAG" -R ques123/screencap-web >/dev/null 2>&1; then
  gh release upload "$TAG" $FILES --clobber -R ques123/screencap-web
else
  gh release create "$TAG" $FILES -R ques123/screencap-web --target "$(git rev-parse HEAD)" $DRAFT --title "Screencap $VERSION" \
    --notes "Screencap for Mac $VERSION. Download from https://screencap.co/download. Built from this tag; signed by Dharma Loop LLC and notarized by Apple."
fi
echo "released $TAG"

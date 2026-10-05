#!/bin/bash
# Build, sign, notarize and publish a Screencap Mac release to GitHub Releases on ques123/screencap-web.
#   scripts/screencap-release.sh [--targets "aarch64-apple-darwin x86_64-apple-darwin"] [--skip-build] [--draft]
# Local requirements (never committed): the Developer ID identity in the login keychain, the App Store
# Connect API key in ~/.appstoreconnect, and the updater key in ~/.tauri. See scripts/screencap-build-env.sh.
# The version comes from apps/desktop/src-tauri/Cargo.toml; bump it before releasing.
set -euo pipefail
cd "$(dirname "$0")/.."
TARGETS="aarch64-apple-darwin x86_64-apple-darwin"; SKIP_BUILD=0; DRAFT=""
while [ $# -gt 0 ]; do case "$1" in
  --targets) TARGETS="$2"; shift 2 ;; --skip-build) SKIP_BUILD=1; shift ;; --draft) DRAFT="--draft"; shift ;;
  *) echo "unknown option $1"; exit 2 ;; esac; done
[ -z "$(git status --porcelain -- apps crates packages Cargo.lock)" ] || { echo "uncommitted app changes; commit first"; exit 1; }
. scripts/screencap-build-env.sh
VERSION=$(sed -n 's/^version = "\(.*\)"/\1/p' apps/desktop/src-tauri/Cargo.toml | head -1)
TAG="screencap-v$VERSION"; OUT="target/screencap-release/$VERSION"; mkdir -p "$OUT"
echo "Screencap $VERSION for: $TARGETS"

notarize() { xcrun notarytool submit "$1" --key "$APPLE_API_KEY_PATH" --key-id "$APPLE_API_KEY" --issuer "$APPLE_API_ISSUER" --wait --timeout 30m; }

for T in $TARGETS; do
  case "$T" in aarch64-apple-darwin) A=aarch64; P=darwin-aarch64 ;; x86_64-apple-darwin) A=x64; P=darwin-x86_64 ;; *) echo "bad target $T"; exit 2 ;; esac
  if [ $SKIP_BUILD = 0 ]; then
    RUST_TARGET_TRIPLE=$T bun run cap-setup
    bun run tauri:build -- --target "$T"
  fi
  B="target/$T/release/bundle"
  DMG=$(ls "$B"/dmg/*.dmg | head -1); APP_TGZ="$B/macos/Screencap.app.tar.gz"
  [ -f "$DMG" ] && [ -f "$APP_TGZ" ] && [ -f "$APP_TGZ.sig" ] || { echo "missing build artifacts in $B"; exit 1; }
  codesign --verify --deep --strict "$B/macos/Screencap.app"
  xcrun stapler validate "$B/macos/Screencap.app" >/dev/null || { echo "app is not notarized/stapled"; exit 1; }
  cp "$DMG" "$OUT/Screencap_$A.dmg"
  codesign --force --sign "$APPLE_SIGNING_IDENTITY" --timestamp "$OUT/Screencap_$A.dmg"
  notarize "$OUT/Screencap_$A.dmg"
  xcrun stapler staple "$OUT/Screencap_$A.dmg"
  spctl --assess --type open --context context:primary-signature -v "$OUT/Screencap_$A.dmg"
  cp "$APP_TGZ" "$OUT/Screencap_$A.app.tar.gz"; cp "$APP_TGZ.sig" "$OUT/Screencap_$A.app.tar.gz.sig"
  printf '%s\t%s\n' "$P" "$A" >> "$OUT/platforms.tsv"
done

python3 - "$OUT" "$VERSION" "$TAG" <<'PY'
import json, sys, pathlib, datetime
out, version, tag = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
base = f"https://github.com/ques123/screencap-web/releases/download/{tag}"
platforms = {}
for line in sorted(set((out / "platforms.tsv").read_text().split("\n"))):
    if not line.strip(): continue
    plat, arch = line.split("\t")
    platforms[plat] = {"signature": (out / f"Screencap_{arch}.app.tar.gz.sig").read_text().strip(),
                       "url": f"{base}/Screencap_{arch}.app.tar.gz"}
manifest = {"version": version, "notes": f"Screencap {version}", "pub_date": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "platforms": platforms}
(out / "latest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(json.dumps({k: list(v) if k == "platforms" else v for k, v in manifest.items()}, indent=1))
PY
rm -f "$OUT/platforms.tsv"

FILES=$(ls "$OUT"/Screencap_* "$OUT/latest.json")
if gh release view "$TAG" -R ques123/screencap-web >/dev/null 2>&1; then
  gh release upload "$TAG" $FILES --clobber -R ques123/screencap-web
else
  gh release create "$TAG" $FILES -R ques123/screencap-web $DRAFT --title "Screencap $VERSION" \
    --notes "Screencap for Mac $VERSION. Download from https://screencap.co/download. Built from this tag; signed by Dharma Loop LLC and notarized by Apple."
fi
echo "released $TAG"

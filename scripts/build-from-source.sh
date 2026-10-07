#!/bin/bash
# Build the Screencap Mac app yourself, from this source code, on your own Mac.
#
# Nothing here needs Screencap's keys: the app gets a local (ad-hoc) signature, so it runs on the Mac
# that built it. It talks to https://screencap.co exactly like the official download, so you sign in
# and share as usual. Read the code first (or have an AI assistant review it), then run:
#
#   scripts/build-from-source.sh
#
# You need: Xcode (from the App Store, opened once), Rust (https://rustup.rs), Bun (https://bun.sh),
# Node 20+ and cmake (`brew install cmake`). The first build takes 15 to 40 minutes.
set -euo pipefail
cd "$(dirname "$0")/.."

case "$(uname -m)" in
  arm64) TARGET=aarch64-apple-darwin ;;
  x86_64) TARGET=x86_64-apple-darwin ;;
  *) echo "Screencap builds on macOS only (Apple Silicon or Intel)."; exit 1 ;;
esac
[ "$(uname -s)" = Darwin ] || { echo "Screencap builds on macOS only."; exit 1; }

export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"
missing=()
for c in cargo rustup bun node cmake; do command -v "$c" >/dev/null || missing+=("$c"); done
if [ ${#missing[@]} -gt 0 ]; then
  echo "Missing: ${missing[*]}. Install Rust (https://rustup.rs), Bun (https://bun.sh), Node 20+ and cmake (brew install cmake)."
  exit 1
fi
# The renderer's Metal shaders need full Xcode, not just the Command Line Tools.
if ! xcrun -f metal >/dev/null 2>&1; then
  echo "Full Xcode is needed. Install it from the App Store, open it once, then run:"
  echo "  sudo xcode-select -s /Applications/Xcode.app/Contents/Developer"
  echo "(or set DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer for this build)."
  exit 1
fi

echo "== Building Screencap for $TARGET"
rustup target add "$TARGET" >/dev/null
bun install
export RUST_TARGET_TRIPLE="$TARGET" TURBO_FORCE=true
bun run cap-setup        # downloads FFmpeg and the other native libraries the recorder links against

# No Screencap secrets: sign locally, skip the update archives (those need our updater key).
env -u APPLE_SIGNING_IDENTITY -u APPLE_CERTIFICATE -u APPLE_API_KEY -u APPLE_API_ISSUER \
    -u APPLE_API_KEY_PATH -u TAURI_SIGNING_PRIVATE_KEY -u TAURI_SIGNING_PRIVATE_KEY_PASSWORD \
  bun run tauri:build -- --target "$TARGET" --bundles app \
    --config '{"bundle":{"createUpdaterArtifacts":false,"macOS":{"signingIdentity":"-"}}}'

APP="target/$TARGET/release/bundle/macos/Screencap.app"
[ -d "$APP" ] || { echo "Build finished but $APP is missing."; exit 1; }
echo
echo "Built: $PWD/$APP"
echo "Install it with:  ditto \"$APP\" /Applications/Screencap.app"

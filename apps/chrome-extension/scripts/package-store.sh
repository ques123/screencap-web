#!/usr/bin/env bash
# Chrome Web Store upload zip: fresh build, manifest.json at the zip root, and the
# manifest "key" removed (the store signs with its own key; the key in the repo only
# pins the unpacked dev build to the same extension id).
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"
bun run build >/dev/null
VERSION="$(node -p 'require("./dist/manifest.json").version')"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
cp -R dist/. "$STAGE/"
node -e '
	const fs = require("fs");
	const p = process.argv[1];
	const m = JSON.parse(fs.readFileSync(p, "utf8"));
	delete m.key;
	fs.writeFileSync(p, JSON.stringify(m, null, "\t") + "\n");
' "$STAGE/manifest.json"
OUT="$HERE/store-dist/screencap-chrome-$VERSION.zip"
mkdir -p "$(dirname "$OUT")"
rm -f "$OUT"
( cd "$STAGE" && zip -qr "$OUT" . -x '.*' '*.map' )
echo "built ${OUT#"$HERE"/} ($(du -h "$OUT" | cut -f1), version $VERSION)"

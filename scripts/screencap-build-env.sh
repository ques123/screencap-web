# Sourced by the Screencap Mac build/release. Every secret is read from a local file outside the repo.
export PATH="$HOME/.bun/bin:$HOME/.cargo/bin:$PATH"
export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
export APPLE_SIGNING_IDENTITY=BB356E1B32691D2C3EE89C19F5CE59F3D032158B   # Developer ID Application: Dharma Loop LLC (G2)
export APPLE_API_KEY=PTD53SXXNP
export APPLE_API_KEY_PATH="$HOME/.appstoreconnect/private_keys/AuthKey_PTD53SXXNP.p8"
export APPLE_API_ISSUER="$(sed -n 's/^ISSUER = "\(.*\)"/\1/p' "$HOME/.appstoreconnect/tanki-dist/asc.py")"
export TAURI_SIGNING_PRIVATE_KEY="$(cat "$HOME/.tauri/screencap-updater.key")"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="$(cat "$HOME/.tauri/screencap-updater.password")"
export VITE_SERVER_URL=https://screencap.co

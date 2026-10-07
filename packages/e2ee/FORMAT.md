# Screencap end-to-end encryption format, version 1

This is the contract between the Mac app (Rust, `crates/e2ee`) and the browser (TypeScript,
`packages/e2ee`). Both implementations must pass every case in `test-vectors.json`, which
`scripts/gen-vectors.py` generates with an independent implementation (Python `cryptography`).

## Content key

- `K` is 32 bytes from a cryptographically secure random source, one per video.
- In a share link it is the fragment parameter `k`, base64url without padding (RFC 4648 section 5):
  exactly 43 characters from `A-Z a-z 0-9 - _`, canonical (the two unused bits of the last
  character are zero). Anything else is invalid, never "best effort".
- The fragment may hold other `&`-separated parameters (`#t=30&k=...`); only `k` matters.
- Link: `https://screencap.co/s/<videoId>#k=<key>`. Query parameters go before the `#`
  (`/s/<id>?recordingStopped=1#k=<key>`).

## Fingerprint

`fingerprint = hex(SHA-256("screencap-e2ee-fp" || 0x00 || K)[0..16])`, 32 lowercase hex
characters. The server stores it so the page can tell "wrong key" from "corrupt data" before it
downloads anything. It reveals nothing about `K`.

## Encrypted object

Every stored object of an encrypted recording (init segments, media segments, the thumbnail) is
encrypted on its own. The manifest `segments/manifest.json` is not encrypted.

    subpath  = the object key relative to "<ownerId>/<videoId>/",
               e.g. "segments/video/init.mp4", "segments/audio/segment_007.m4s",
               "screenshot/screen-capture.jpg"
    salt     = 16 random bytes, fresh for every upload attempt of the object
    subkey   = HKDF-SHA256(ikm = K, salt = salt, info = UTF-8("screencap-e2ee/v1/" + subpath), L = 32)

    header (32 bytes):
        0..4    "SCE1" (0x53 0x43 0x45 0x31)
        4       version = 0x01
        5       chunk_log2: chunk size is 2^chunk_log2 bytes. Writers use 18 (256 KiB).
                Readers accept 12..=24 and reject anything else.
        6..16   zero bytes (readers reject non-zero)
        16..32  salt

    chunks: the plaintext split into chunks of 2^chunk_log2 bytes; the last chunk may be shorter.
        n = max(1, ceil(len / chunk_size)). An empty plaintext is one empty chunk.
        A plaintext that is an exact multiple of the chunk size has no extra empty chunk.

    chunk i (0-based):
        nonce = 4 zero bytes || BE64(i)                          (12 bytes)
        aad   = header (32 bytes) || BE64(i) || last             (41 bytes; last = 0x01 for chunk n-1, else 0x00)
        out_i = AES-256-GCM-Encrypt(subkey, nonce, aad, chunk_i)  (ciphertext || 16-byte tag)

    object = header || out_0 || out_1 || ... || out_{n-1}
    size   = 32 + len + 16 * n

## Decrypting

1. Reject objects shorter than 48 bytes, a wrong magic, a version other than 1, a chunk_log2
   outside 12..=24, or non-zero reserved bytes.
2. Read `chunk_size + 16` bytes at a time after the header. The final read may be shorter; if it
   is shorter than 16 bytes the object is `DecryptFailed`. The final piece is decrypted with `last = 0x01`, every other with `0x00`.
3. Any authentication failure fails the whole object. Never return partial plaintext.

This rejects a wrong key, a wrong subpath (an object moved to another path or another video),
any bit flip, reordered chunks, truncation at a chunk boundary and appended data.

## Errors

Both implementations expose the same error kinds: `InvalidKey` (fragment or key bytes),
`InvalidHeader` (length, magic, version, chunk size, reserved bytes) and `DecryptFailed`
(authentication failed, wrong key, wrong subpath, truncation, tampering).

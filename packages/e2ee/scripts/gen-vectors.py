import base64
import hashlib
import json
import math
import os
import sys

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

MAGIC = b"SCE1"
INFO_PREFIX = b"screencap-e2ee/v1/"
FP_PREFIX = b"screencap-e2ee-fp\x00"


def b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def fingerprint(key: bytes) -> str:
    return hashlib.sha256(FP_PREFIX + key).digest()[:16].hex()


def plaintext(length: int) -> bytes:
    return bytes((i * 31 + 7) & 0xFF for i in range(length))


def header(salt: bytes, chunk_log2: int) -> bytes:
    return MAGIC + bytes([1, chunk_log2]) + bytes(10) + salt


def subkey(key: bytes, salt: bytes, subpath: str) -> bytes:
    return HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        info=INFO_PREFIX + subpath.encode(),
    ).derive(key)


def split_chunks(data: bytes, chunk_size: int) -> list[bytes]:
    count = max(1, math.ceil(len(data) / chunk_size))
    return [data[i * chunk_size : (i + 1) * chunk_size] for i in range(count)]


def chunk_nonce(index: int) -> bytes:
    return bytes(4) + index.to_bytes(8, "big")


def chunk_aad(head: bytes, index: int, last: bool) -> bytes:
    return head + index.to_bytes(8, "big") + (b"\x01" if last else b"\x00")


def encrypt(key: bytes, subpath: str, salt: bytes, chunk_log2: int, data: bytes) -> bytes:
    head = header(salt, chunk_log2)
    aead = AESGCM(subkey(key, salt, subpath))
    chunks = split_chunks(data, 1 << chunk_log2)
    out = bytearray(head)
    for index, chunk in enumerate(chunks):
        last = index == len(chunks) - 1
        out += aead.encrypt(chunk_nonce(index), chunk, chunk_aad(head, index, last))
    return bytes(out)


def encrypt_chunks_raw(key, subpath, salt, chunk_log2, chunks_with_flags):
    head = header(salt, chunk_log2)
    aead = AESGCM(subkey(key, salt, subpath))
    out = bytearray(head)
    for index, (chunk, last) in enumerate(chunks_with_flags):
        out += aead.encrypt(chunk_nonce(index), chunk, chunk_aad(head, index, last))
    return bytes(out)


KEY_A = bytes(range(32))
KEY_B = bytes(range(32, 64))
KEY_C = hashlib.sha256(b"screencap test key c").digest()
SALT_A = bytes(range(0xA0, 0xB0))
SALT_B = bytes(range(0xC0, 0xD0))


def object_case(name, key, salt, subpath, chunk_log2, length, include_full):
    data = plaintext(length)
    ct = encrypt(key, subpath, salt, chunk_log2, data)
    assert len(ct) == 32 + length + 16 * max(1, math.ceil(length / (1 << chunk_log2)))
    case = {
        "name": name,
        "keyHex": key.hex(),
        "saltHex": salt.hex(),
        "subpath": subpath,
        "chunkLog2": chunk_log2,
        "plaintextLength": length,
        "ciphertextLength": len(ct),
        "ciphertextSha256": hashlib.sha256(ct).hexdigest(),
    }
    if include_full:
        case["ciphertextHex"] = ct.hex()
    return case, ct


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
        os.path.dirname(__file__), "..", "test-vectors.json"
    )

    keys = [
        {"keyHex": k.hex(), "keyB64url": b64url(k), "fingerprint": fingerprint(k)}
        for k in (KEY_A, KEY_B, KEY_C)
    ]

    a64 = b64url(KEY_A)
    c64 = b64url(KEY_C)
    non_canonical = a64[:-1] + ("B" if a64[-1] == "A" else chr(ord(a64[-1]) + 1))
    assert base64.urlsafe_b64decode(non_canonical + "=") == KEY_A
    fragments = [
        {"hash": f"#k={a64}", "keyHex": KEY_A.hex()},
        {"hash": f"#k={c64}&t=30", "keyHex": KEY_C.hex()},
        {"hash": f"#t=30&k={c64}", "keyHex": KEY_C.hex()},
        {"hash": f"k={a64}", "keyHex": KEY_A.hex()},
        {"hash": "", "keyHex": None, "error": None},
        {"hash": "#", "keyHex": None, "error": None},
        {"hash": "#t=30", "keyHex": None, "error": None},
        {"hash": "#k=", "keyHex": None, "error": "InvalidKey"},
        {"hash": f"#k={a64[:-1]}", "keyHex": None, "error": "InvalidKey"},
        {"hash": f"#k={a64}A", "keyHex": None, "error": "InvalidKey"},
        {"hash": f"#k={a64[:-2]}+/", "keyHex": None, "error": "InvalidKey"},
        {"hash": f"#k={a64}=", "keyHex": None, "error": "InvalidKey"},
        {"hash": f"#k={non_canonical}", "keyHex": None, "error": "InvalidKey"},
    ]

    links = [
        {
            "base": "https://screencap.co/s/abc123xyz45",
            "query": None,
            "keyHex": KEY_A.hex(),
            "link": f"https://screencap.co/s/abc123xyz45#k={a64}",
        },
        {
            "base": "https://screencap.co/s/abc123xyz45",
            "query": "recordingStopped=1",
            "keyHex": KEY_A.hex(),
            "link": f"https://screencap.co/s/abc123xyz45?recordingStopped=1#k={a64}",
        },
        {
            "base": f"https://screencap.co/s/abc123xyz45#k={a64}",
            "query": "recordingStopped=1",
            "keyHex": KEY_A.hex(),
            "link": f"https://screencap.co/s/abc123xyz45?recordingStopped=1#k={a64}",
        },
        {
            "base": "https://screencap.co/s/abc123xyz45?a=1",
            "query": "recordingStopped=1",
            "keyHex": KEY_C.hex(),
            "link": f"https://screencap.co/s/abc123xyz45?a=1&recordingStopped=1#k={c64}",
        },
    ]

    objects = []
    small = [
        ("empty", KEY_A, SALT_A, "segments/video/init.mp4", 12, 0),
        ("hello", KEY_A, SALT_A, "segments/video/segment_001.m4s", 12, 5),
        ("one-full-chunk", KEY_A, SALT_A, "segments/audio/segment_002.m4s", 12, 4096),
        ("one-chunk-plus-one", KEY_B, SALT_B, "segments/audio/init.mp4", 12, 4097),
        ("three-chunks", KEY_C, SALT_B, "screenshot/screen-capture.jpg", 12, 10000),
        ("default-chunk-small", KEY_A, SALT_B, "segments/video/segment_010.m4s", 18, 1000),
    ]
    by_name = {}
    for name, key, salt, subpath, log2, length in small:
        case, ct = object_case(name, key, salt, subpath, log2, length, True)
        objects.append(case)
        by_name[name] = (case, ct)
    for name, key, salt, subpath, log2, length in [
        ("default-chunk-exact-two", KEY_B, SALT_A, "segments/video/segment_123.m4s", 18, 2 << 18),
        ("default-chunk-large", KEY_C, SALT_A, "segments/video/segment_004.m4s", 18, 600000),
    ]:
        case, _ = object_case(name, key, salt, subpath, log2, length, False)
        objects.append(case)

    base_case, base_ct = by_name["three-chunks"]
    key, subpath = KEY_C, base_case["subpath"]
    cs = 4096 + 16
    body = base_ct[32:]
    pieces = [body[0:cs], body[cs : 2 * cs], body[2 * cs :]]
    head = base_ct[:32]

    def flip(data: bytes, offset: int) -> bytes:
        mutable = bytearray(data)
        mutable[offset] ^= 0x01
        return bytes(mutable)

    full = plaintext(10000)
    tampered = [
        ("bit-flip-chunk-1", key, subpath, flip(base_ct, 32 + cs + 10), "DecryptFailed"),
        ("bit-flip-tag", key, subpath, flip(base_ct, len(base_ct) - 1), "DecryptFailed"),
        ("bit-flip-salt", key, subpath, flip(base_ct, 20), "DecryptFailed"),
        ("swapped-chunks", key, subpath, head + pieces[1] + pieces[0] + pieces[2], "DecryptFailed"),
        ("dropped-last-chunk", key, subpath, head + pieces[0] + pieces[1], "DecryptFailed"),
        ("appended-chunk", key, subpath, base_ct + pieces[1], "DecryptFailed"),
        ("truncated-mid-chunk", key, subpath, base_ct[:-5], "DecryptFailed"),
        (
            "early-last-flag",
            key,
            subpath,
            encrypt_chunks_raw(
                key, subpath, SALT_B, 12,
                [(full[0:4096], True), (full[4096:8192], False), (full[8192:], True)],
            ),
            "DecryptFailed",
        ),
        (
            "no-last-flag",
            key,
            subpath,
            encrypt_chunks_raw(
                key, subpath, SALT_B, 12,
                [(full[0:4096], False), (full[4096:8192], False), (full[8192:], False)],
            ),
            "DecryptFailed",
        ),
        ("wrong-subpath", key, "screenshot/screen-capture.png", base_ct, "DecryptFailed"),
        ("wrong-key", KEY_A, subpath, base_ct, "DecryptFailed"),
        ("bad-magic", key, subpath, b"SCE2" + base_ct[4:], "InvalidHeader"),
        ("bad-version", key, subpath, base_ct[:4] + b"\x02" + base_ct[5:], "InvalidHeader"),
        ("chunk-log2-too-small", key, subpath, base_ct[:5] + b"\x0b" + base_ct[6:], "InvalidHeader"),
        ("chunk-log2-too-large", key, subpath, base_ct[:5] + b"\x19" + base_ct[6:], "InvalidHeader"),
        ("reserved-nonzero", key, subpath, base_ct[:10] + b"\x01" + base_ct[11:], "InvalidHeader"),
        ("header-only", key, subpath, base_ct[:32], "InvalidHeader"),
        ("too-short", key, subpath, base_ct[:47], "InvalidHeader"),
        ("tail-shorter-than-tag", key, subpath, head + pieces[0] + pieces[1] + pieces[2][:15], "DecryptFailed"),
    ]

    vectors = {
        "format": 1,
        "plaintext": "byte i of a plaintext of length n is (i * 31 + 7) mod 256",
        "keys": keys,
        "fragments": fragments,
        "links": links,
        "objects": objects,
        "tampered": [
            {"name": n, "keyHex": k.hex(), "subpath": s, "ciphertextHex": c.hex(), "error": e}
            for n, k, s, c, e in tampered
        ],
    }
    with open(out_path, "w") as handle:
        json.dump(vectors, handle, indent=1)
        handle.write("\n")
    print(f"wrote {out_path}: {len(objects)} objects, {len(tampered)} tampered, {len(fragments)} fragments")


if __name__ == "__main__":
    main()

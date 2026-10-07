use cap_e2ee::{
    CHUNK_LOG2, ContentKey, Error, decrypt_object, encrypt_object, encrypt_object_with,
    encrypted_len, parse_key_fragment, share_link,
};
use serde_json::Value;
use std::fmt::Write;

fn vectors() -> Value {
    serde_json::from_str(include_str!("../../../packages/e2ee/test-vectors.json")).unwrap()
}

fn from_hex(text: &str) -> Vec<u8> {
    (0..text.len() / 2)
        .map(|i| u8::from_str_radix(&text[i * 2..i * 2 + 2], 16).unwrap())
        .collect()
}

fn to_hex(bytes: &[u8]) -> String {
    bytes.iter().fold(String::new(), |mut s, b| {
        write!(s, "{b:02x}").unwrap();
        s
    })
}

fn key_from_hex(text: &str) -> ContentKey {
    ContentKey::from_bytes(from_hex(text).try_into().unwrap())
}

fn plaintext(len: usize) -> Vec<u8> {
    (0..len).map(|i| ((i * 31 + 7) % 256) as u8).collect()
}

fn kind(name: &str) -> Error {
    match name {
        "InvalidKey" => Error::InvalidKey,
        "InvalidHeader" => Error::InvalidHeader,
        "DecryptFailed" => Error::DecryptFailed,
        other => panic!("unknown error kind {other}"),
    }
}

#[test]
fn keys() {
    for case in vectors()["keys"].as_array().unwrap() {
        let key = key_from_hex(case["keyHex"].as_str().unwrap());
        assert_eq!(key.to_base64url(), case["keyB64url"].as_str().unwrap());
        assert_eq!(key.fingerprint(), case["fingerprint"].as_str().unwrap());
        let parsed = ContentKey::from_base64url(case["keyB64url"].as_str().unwrap()).unwrap();
        assert_eq!(parsed.as_bytes(), key.as_bytes());
    }
}

#[test]
fn fragments() {
    for case in vectors()["fragments"].as_array().unwrap() {
        let hash = case["hash"].as_str().unwrap();
        let result = parse_key_fragment(hash);
        if let Some(error) = case.get("error").and_then(Value::as_str) {
            assert_eq!(result.err(), Some(kind(error)), "{hash}");
        } else if let Some(hex) = case["keyHex"].as_str() {
            let key = result.unwrap().unwrap();
            assert_eq!(to_hex(key.as_bytes()), hex, "{hash}");
        } else {
            assert!(result.unwrap().is_none(), "{hash}");
        }
    }
}

#[test]
fn links() {
    for case in vectors()["links"].as_array().unwrap() {
        let key = key_from_hex(case["keyHex"].as_str().unwrap());
        let link = share_link(case["base"].as_str().unwrap(), case["query"].as_str(), &key);
        assert_eq!(link, case["link"].as_str().unwrap());
    }
}

#[test]
fn objects() {
    for case in vectors()["objects"].as_array().unwrap() {
        let name = case["name"].as_str().unwrap();
        let key = key_from_hex(case["keyHex"].as_str().unwrap());
        let subpath = case["subpath"].as_str().unwrap();
        let salt: [u8; 16] = from_hex(case["saltHex"].as_str().unwrap())
            .try_into()
            .unwrap();
        let chunk_log2 = case["chunkLog2"].as_u64().unwrap() as u8;
        let data = plaintext(case["plaintextLength"].as_u64().unwrap() as usize);
        let object = encrypt_object_with(&key, subpath, salt, chunk_log2, &data).unwrap();
        assert_eq!(
            object.len() as u64,
            case["ciphertextLength"].as_u64().unwrap(),
            "{name}"
        );
        let sha = ring::digest::digest(&ring::digest::SHA256, &object);
        assert_eq!(
            to_hex(sha.as_ref()),
            case["ciphertextSha256"].as_str().unwrap(),
            "{name}"
        );
        if let Some(hex) = case.get("ciphertextHex").and_then(Value::as_str) {
            assert_eq!(to_hex(&object), hex, "{name}");
        }
        assert_eq!(
            decrypt_object(&key, subpath, &object).unwrap(),
            data,
            "{name}"
        );
    }
}

#[test]
fn tampered() {
    for case in vectors()["tampered"].as_array().unwrap() {
        let name = case["name"].as_str().unwrap();
        let key = key_from_hex(case["keyHex"].as_str().unwrap());
        let object = from_hex(case["ciphertextHex"].as_str().unwrap());
        let result = decrypt_object(&key, case["subpath"].as_str().unwrap(), &object);
        assert_eq!(
            result.err(),
            Some(kind(case["error"].as_str().unwrap())),
            "{name}"
        );
    }
}

#[test]
fn round_trip_around_chunk_boundaries() {
    let key = ContentKey::generate();
    let chunk = 1usize << CHUNK_LOG2;
    let sizes = [
        0,
        1,
        15,
        16,
        chunk - 1,
        chunk,
        chunk + 1,
        2 * chunk - 1,
        2 * chunk,
        2 * chunk + 1,
        3 * chunk + 12345,
    ];
    for size in sizes {
        let data = plaintext(size);
        let object = encrypt_object(&key, "segments/video/segment_001.m4s", &data);
        assert_eq!(object.len() as u64, encrypted_len(size as u64), "{size}");
        assert_eq!(
            decrypt_object(&key, "segments/video/segment_001.m4s", &object).unwrap(),
            data
        );
        assert_eq!(
            decrypt_object(&key, "segments/video/segment_002.m4s", &object),
            Err(Error::DecryptFailed)
        );
    }
}

#[test]
fn encrypted_len_values() {
    assert_eq!(encrypted_len(0), 48);
    assert_eq!(encrypted_len(1), 49);
    assert_eq!(encrypted_len(262_144), 32 + 262_144 + 16);
    assert_eq!(encrypted_len(262_145), 32 + 262_145 + 32);
}

#[test]
fn key_rejects_bad_text_and_debug_is_redacted() {
    assert!(ContentKey::from_base64url("").is_err());
    let key = ContentKey::generate();
    assert_eq!(format!("{key:?}"), "ContentKey(<redacted>)");
    let padded = format!("{}=", key.to_base64url());
    assert_eq!(
        ContentKey::from_base64url(&padded).err(),
        Some(Error::InvalidKey)
    );
}

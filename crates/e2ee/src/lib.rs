use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use ring::{
    aead::{AES_256_GCM, Aad, LessSafeKey, NONCE_LEN, Nonce, UnboundKey},
    digest,
    hkdf::{HKDF_SHA256, KeyType, Salt},
    rand::{SecureRandom, SystemRandom},
};
use std::fmt;
use zeroize::{Zeroize, Zeroizing};

pub const HEADER_LEN: usize = 32;
pub const TAG_LEN: usize = 16;
pub const CHUNK_LOG2: u8 = 18;

const MAGIC: &[u8; 4] = b"SCE1";
const VERSION: u8 = 1;
const MIN_CHUNK_LOG2: u8 = 12;
const MAX_CHUNK_LOG2: u8 = 24;
const KEY_TEXT_LEN: usize = 43;
const FINGERPRINT_LABEL: &[u8] = b"screencap-e2ee-fp";
const SUBKEY_INFO_PREFIX: &str = "screencap-e2ee/v1/";

#[derive(Debug, thiserror::Error, PartialEq, Eq, Clone, Copy)]
pub enum Error {
    #[error("invalid content key")]
    InvalidKey,
    #[error("invalid encrypted object header")]
    InvalidHeader,
    #[error("decryption failed")]
    DecryptFailed,
}

pub struct ContentKey([u8; 32]);

impl ContentKey {
    pub fn generate() -> Self {
        let mut bytes = [0u8; 32];
        SystemRandom::new()
            .fill(&mut bytes)
            .expect("system random source unavailable");
        Self(bytes)
    }

    pub fn from_bytes(bytes: [u8; 32]) -> Self {
        Self(bytes)
    }

    pub fn from_base64url(text: &str) -> Result<Self, Error> {
        if text.len() != KEY_TEXT_LEN {
            return Err(Error::InvalidKey);
        }
        let mut decoded = Zeroizing::new(
            URL_SAFE_NO_PAD
                .decode(text)
                .map_err(|_| Error::InvalidKey)?,
        );
        let mut bytes = [0u8; 32];
        if decoded.len() != bytes.len() {
            return Err(Error::InvalidKey);
        }
        bytes.copy_from_slice(&decoded);
        decoded.zeroize();
        Ok(Self(bytes))
    }

    pub fn to_base64url(&self) -> String {
        URL_SAFE_NO_PAD.encode(self.0)
    }

    pub fn fingerprint(&self) -> String {
        let mut ctx = digest::Context::new(&digest::SHA256);
        ctx.update(FINGERPRINT_LABEL);
        ctx.update(&[0]);
        ctx.update(&self.0);
        let hash = ctx.finish();
        let mut out = String::with_capacity(32);
        for byte in &hash.as_ref()[..16] {
            out.push(char::from_digit(u32::from(byte >> 4), 16).unwrap_or('0'));
            out.push(char::from_digit(u32::from(byte & 0xf), 16).unwrap_or('0'));
        }
        out
    }

    pub fn as_bytes(&self) -> &[u8; 32] {
        &self.0
    }
}

impl Clone for ContentKey {
    fn clone(&self) -> Self {
        Self(self.0)
    }
}

impl Drop for ContentKey {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}

impl fmt::Debug for ContentKey {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str("ContentKey(<redacted>)")
    }
}

pub fn parse_key_fragment(fragment: &str) -> Result<Option<ContentKey>, Error> {
    let fragment = fragment.strip_prefix('#').unwrap_or(fragment);
    for param in fragment.split('&') {
        if let Some(value) = param.strip_prefix("k=") {
            return ContentKey::from_base64url(value).map(Some);
        }
    }
    Ok(None)
}

pub fn share_link(base: &str, query: Option<&str>, key: &ContentKey) -> String {
    let base = base.split('#').next().unwrap_or(base);
    let mut link = String::from(base);
    if let Some(query) = query.map(|q| q.trim_start_matches(['?', '&'])) {
        if !query.is_empty() {
            link.push(if base.contains('?') { '&' } else { '?' });
            link.push_str(query);
        }
    }
    link.push_str("#k=");
    link.push_str(&key.to_base64url());
    link
}

struct SubkeyLen;

impl KeyType for SubkeyLen {
    fn len(&self) -> usize {
        32
    }
}

fn derive_cipher(key: &ContentKey, subpath: &str, salt: &[u8]) -> Result<LessSafeKey, Error> {
    let info = format!("{SUBKEY_INFO_PREFIX}{subpath}");
    let info = [info.as_bytes()];
    let mut subkey = Zeroizing::new([0u8; 32]);
    Salt::new(HKDF_SHA256, salt)
        .extract(key.as_bytes())
        .expand(&info, SubkeyLen)
        .and_then(|okm| okm.fill(&mut subkey[..]))
        .map_err(|_| Error::DecryptFailed)?;
    let unbound = UnboundKey::new(&AES_256_GCM, &subkey[..]).map_err(|_| Error::DecryptFailed)?;
    Ok(LessSafeKey::new(unbound))
}

fn chunk_nonce(index: u64) -> Nonce {
    let mut nonce = [0u8; NONCE_LEN];
    nonce[4..].copy_from_slice(&index.to_be_bytes());
    Nonce::assume_unique_for_key(nonce)
}

fn chunk_aad(header: &[u8], index: u64, last: bool) -> Vec<u8> {
    let mut aad = Vec::with_capacity(HEADER_LEN + 9);
    aad.extend_from_slice(header);
    aad.extend_from_slice(&index.to_be_bytes());
    aad.push(u8::from(last));
    aad
}

pub fn encrypt_object(key: &ContentKey, subpath: &str, plaintext: &[u8]) -> Vec<u8> {
    let mut salt = [0u8; 16];
    SystemRandom::new()
        .fill(&mut salt)
        .expect("system random source unavailable");
    encrypt_object_with(key, subpath, salt, CHUNK_LOG2, plaintext)
        .expect("default chunk size is valid")
}

pub fn encrypt_object_with(
    key: &ContentKey,
    subpath: &str,
    salt: [u8; 16],
    chunk_log2: u8,
    plaintext: &[u8],
) -> Result<Vec<u8>, Error> {
    if !(MIN_CHUNK_LOG2..=MAX_CHUNK_LOG2).contains(&chunk_log2) {
        return Err(Error::InvalidHeader);
    }
    let chunk_size = 1usize << chunk_log2;
    let cipher = derive_cipher(key, subpath, &salt)?;

    let mut header = [0u8; HEADER_LEN];
    header[..4].copy_from_slice(MAGIC);
    header[4] = VERSION;
    header[5] = chunk_log2;
    header[16..].copy_from_slice(&salt);

    let chunk_count = plaintext.len().div_ceil(chunk_size).max(1);
    let mut out = Vec::with_capacity(HEADER_LEN + plaintext.len() + TAG_LEN * chunk_count);
    out.extend_from_slice(&header);

    for index in 0..chunk_count {
        let start = index * chunk_size;
        let end = (start + chunk_size).min(plaintext.len());
        let last = index == chunk_count - 1;
        let aad = chunk_aad(&header, index as u64, last);
        let offset = out.len();
        out.extend_from_slice(&plaintext[start..end]);
        let tag = cipher
            .seal_in_place_separate_tag(
                chunk_nonce(index as u64),
                Aad::from(&aad[..]),
                &mut out[offset..],
            )
            .map_err(|_| Error::DecryptFailed)?;
        out.extend_from_slice(tag.as_ref());
    }
    Ok(out)
}

pub fn decrypt_object(key: &ContentKey, subpath: &str, object: &[u8]) -> Result<Vec<u8>, Error> {
    if object.len() < HEADER_LEN + TAG_LEN {
        return Err(Error::InvalidHeader);
    }
    let header = &object[..HEADER_LEN];
    let chunk_log2 = header[5];
    if &header[..4] != MAGIC
        || header[4] != VERSION
        || !(MIN_CHUNK_LOG2..=MAX_CHUNK_LOG2).contains(&chunk_log2)
        || header[6..16].iter().any(|b| *b != 0)
    {
        return Err(Error::InvalidHeader);
    }
    let cipher = derive_cipher(key, subpath, &header[16..32])?;
    let body = &object[HEADER_LEN..];
    let piece_len = (1usize << chunk_log2) + TAG_LEN;
    let piece_count = body.len().div_ceil(piece_len);

    let mut plaintext = Vec::with_capacity(body.len());
    let result = (|| {
        for (index, piece) in body.chunks(piece_len).enumerate() {
            if piece.len() < TAG_LEN {
                return Err(Error::DecryptFailed);
            }
            let last = index == piece_count - 1;
            let aad = chunk_aad(header, index as u64, last);
            let start = plaintext.len();
            plaintext.extend_from_slice(piece);
            let opened = cipher
                .open_in_place(
                    chunk_nonce(index as u64),
                    Aad::from(&aad[..]),
                    &mut plaintext[start..],
                )
                .map_err(|_| Error::DecryptFailed)?
                .len();
            plaintext.truncate(start + opened);
        }
        Ok(())
    })();
    match result {
        Ok(()) => Ok(plaintext),
        Err(error) => {
            plaintext.zeroize();
            Err(error)
        }
    }
}

pub fn encrypted_len(plaintext_len: u64) -> u64 {
    let chunk_size = 1u64 << CHUNK_LOG2;
    let chunks = plaintext_len.div_ceil(chunk_size).max(1);
    HEADER_LEN as u64 + plaintext_len + TAG_LEN as u64 * chunks
}

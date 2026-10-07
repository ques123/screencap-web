use bytes::Bytes;
use cap_e2ee::ContentKey;
use cap_project::{RecordingMeta, SharingMeta};
use std::path::Path;

pub const MISSING_KEY_ERROR: &str =
    "This encrypted recording's key is missing from its local metadata; local files retained";

pub const STUDIO_UNAVAILABLE_ERROR: &str = "Encrypted Studio upload is not available yet. Turn off Encrypt recordings to upload this recording unencrypted";

pub const CAMERA_ONLY_UNAVAILABLE_ERROR: &str = "Encrypted camera-only upload is not available yet";

pub const THUMBNAIL_SUBPATH: &str = "screenshot/screen-capture.jpg";

pub fn setting_enabled(encrypt_recordings: bool) -> bool {
    cfg!(target_os = "macos") && encrypt_recordings
}

pub fn key_from_link(link: &str) -> Option<ContentKey> {
    let (_, fragment) = link.split_once('#')?;
    cap_e2ee::parse_key_fragment(fragment).ok().flatten()
}

pub fn link_without_fragment(link: &str) -> &str {
    link.split_once('#').map_or(link, |(base, _)| base)
}

pub fn sharing_meta(id: String, link: String) -> SharingMeta {
    let e2ee_key = key_from_link(&link).map(|key| key.to_base64url());
    SharingMeta {
        id,
        link,
        content_hash: None,
        e2ee_key,
    }
}

pub fn recording_stopped_url(link: &str) -> String {
    let (base, fragment) = match link.split_once('#') {
        Some((base, fragment)) => (base, Some(fragment)),
        None => (link, None),
    };
    let separator = if base.contains('?') { '&' } else { '?' };
    let mut url = format!("{base}{separator}recordingStopped=1");
    if let Some(fragment) = fragment {
        url.push('#');
        url.push_str(fragment);
    }
    url
}

pub fn segment_subpath(
    is_init: bool,
    media_type: cap_enc_ffmpeg::segmented_stream::SegmentMediaType,
    index: u32,
) -> String {
    use cap_enc_ffmpeg::segmented_stream::SegmentMediaType;
    let kind = match media_type {
        SegmentMediaType::Video => "video",
        SegmentMediaType::Audio => "audio",
    };
    if is_init {
        format!("segments/{kind}/init.mp4")
    } else {
        format!("segments/{kind}/segment_{index:03}.m4s")
    }
}

pub fn encrypt_for_upload(key: Option<&ContentKey>, subpath: &str, bytes: Bytes) -> Bytes {
    match key {
        Some(key) => Bytes::from(cap_e2ee::encrypt_object(key, subpath, &bytes)),
        None => bytes,
    }
}

pub fn encrypt_thumbnail(key: Option<&ContentKey>, bytes: Vec<u8>) -> Vec<u8> {
    match key {
        Some(key) => cap_e2ee::encrypt_object(key, THUMBNAIL_SUBPATH, &bytes),
        None => bytes,
    }
}

pub fn resolve_upload_key(
    recording_dir: &Path,
    marked_e2ee: bool,
) -> Result<Option<ContentKey>, String> {
    let meta = RecordingMeta::load_for_project(recording_dir).map_err(|error| error.to_string())?;
    let stored = meta
        .sharing
        .as_ref()
        .and_then(|sharing| sharing.e2ee_key.as_deref());
    match stored {
        Some(text) => ContentKey::from_base64url(text)
            .map(Some)
            .map_err(|_| MISSING_KEY_ERROR.to_string()),
        None if marked_e2ee => Err(MISSING_KEY_ERROR.to_string()),
        None => Ok(None),
    }
}

pub fn upload_marked_e2ee(upload: Option<&cap_project::UploadMeta>) -> bool {
    matches!(
        upload,
        Some(cap_project::UploadMeta::SegmentUpload { e2ee: true, .. })
    )
}

pub fn studio_upload_blocker(
    setting_enabled: bool,
    sharing: Option<&SharingMeta>,
) -> Option<&'static str> {
    let encrypted_link = sharing.is_some_and(|sharing| sharing.e2ee_key.is_some());
    (encrypted_link || (setting_enabled && sharing.is_none())).then_some(STUDIO_UNAVAILABLE_ERROR)
}

pub async fn upload_e2ee_after_stop(_recording_dir: &Path) -> Result<(), String> {
    Err(CAMERA_ONLY_UNAVAILABLE_ERROR.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use cap_enc_ffmpeg::segmented_stream::SegmentMediaType;

    fn key() -> ContentKey {
        ContentKey::from_bytes([7u8; 32])
    }

    #[test]
    fn recording_stopped_url_goes_before_the_fragment() {
        let link = cap_e2ee::share_link("https://screencap.co/s/abc", None, &key());
        let url = recording_stopped_url(&link);
        assert_eq!(
            url,
            format!(
                "https://screencap.co/s/abc?recordingStopped=1#k={}",
                key().to_base64url()
            )
        );
        assert_eq!(
            recording_stopped_url("https://screencap.co/s/abc"),
            "https://screencap.co/s/abc?recordingStopped=1"
        );
        assert_eq!(
            recording_stopped_url("https://screencap.co/s/abc?x=1"),
            "https://screencap.co/s/abc?x=1&recordingStopped=1"
        );
    }

    #[test]
    fn key_round_trips_through_the_link() {
        let link = cap_e2ee::share_link("https://screencap.co/s/abc", None, &key());
        assert_eq!(
            key_from_link(&link).map(|k| k.to_base64url()),
            Some(key().to_base64url())
        );
        assert!(key_from_link("https://screencap.co/s/abc").is_none());
        assert_eq!(link_without_fragment(&link), "https://screencap.co/s/abc");
        let sharing = sharing_meta("abc".into(), link);
        assert_eq!(sharing.e2ee_key, Some(key().to_base64url()));
        assert!(
            sharing_meta("abc".into(), "https://x/s/abc".into())
                .e2ee_key
                .is_none()
        );
    }

    #[test]
    fn subpaths_match_the_server_layout() {
        assert_eq!(
            segment_subpath(true, SegmentMediaType::Video, 0),
            "segments/video/init.mp4"
        );
        assert_eq!(
            segment_subpath(true, SegmentMediaType::Audio, 0),
            "segments/audio/init.mp4"
        );
        assert_eq!(
            segment_subpath(false, SegmentMediaType::Video, 7),
            "segments/video/segment_007.m4s"
        );
        assert_eq!(
            segment_subpath(false, SegmentMediaType::Audio, 1234),
            "segments/audio/segment_1234.m4s"
        );
    }

    #[test]
    fn encryption_is_applied_only_with_a_key_and_decrypts_back() {
        let plain = Bytes::from_static(b"segment bytes");
        assert_eq!(
            encrypt_for_upload(None, "segments/video/init.mp4", plain.clone()),
            plain
        );
        let key = key();
        let encrypted = encrypt_for_upload(Some(&key), "segments/video/init.mp4", plain.clone());
        assert_eq!(
            encrypted.len() as u64,
            cap_e2ee::encrypted_len(plain.len() as u64)
        );
        assert_eq!(
            cap_e2ee::decrypt_object(&key, "segments/video/init.mp4", &encrypted).unwrap(),
            plain.to_vec()
        );
        assert!(
            cap_e2ee::decrypt_object(&key, "segments/video/segment_000.m4s", &encrypted).is_err()
        );
    }

    #[test]
    fn setting_is_ignored_off_macos() {
        assert_eq!(setting_enabled(true), cfg!(target_os = "macos"));
        assert!(!setting_enabled(false));
    }
}

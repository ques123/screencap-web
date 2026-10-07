use bytes::Bytes;
use cap_e2ee::ContentKey;
use cap_enc_ffmpeg::segmented_stream::{SegmentCompletedEvent, SegmentMediaType};
use cap_project::{RecordingMeta, SharingMeta};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tracing::warn;

pub const MISSING_KEY_ERROR: &str =
    "This encrypted recording's key is missing from its local metadata; local files retained";

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

pub fn sharing_after_upload(
    existing: Option<&SharingMeta>,
    id: String,
    server_link: String,
) -> SharingMeta {
    let stored = existing
        .and_then(|sharing| sharing.e2ee_key.as_deref())
        .and_then(|text| ContentKey::from_base64url(text).ok());
    match stored {
        Some(key) => {
            let link = cap_e2ee::share_link(link_without_fragment(&server_link), None, &key);
            SharingMeta {
                id,
                link,
                content_hash: existing.and_then(|sharing| sharing.content_hash.clone()),
                e2ee_key: Some(key.to_base64url()),
            }
        }
        None => sharing_meta(id, server_link),
    }
}

pub fn key_from_meta(meta: &RecordingMeta) -> Result<Option<ContentKey>, String> {
    match meta
        .sharing
        .as_ref()
        .and_then(|sharing| sharing.e2ee_key.as_deref())
    {
        Some(text) => ContentKey::from_base64url(text)
            .map(Some)
            .map_err(|_| MISSING_KEY_ERROR.to_string()),
        None if upload_marked_e2ee(meta.upload.as_ref()) => Err(MISSING_KEY_ERROR.to_string()),
        None => Ok(None),
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

pub enum StudioUploadMode {
    Plaintext,
    EncryptedNew,
    EncryptedExisting(ContentKey),
}

pub fn studio_upload_mode(
    setting_enabled: bool,
    sharing: Option<&SharingMeta>,
) -> Result<StudioUploadMode, String> {
    match sharing {
        Some(sharing) => match sharing.e2ee_key.as_deref() {
            Some(text) => ContentKey::from_base64url(text)
                .map(StudioUploadMode::EncryptedExisting)
                .map_err(|_| MISSING_KEY_ERROR.to_string()),
            None => Ok(StudioUploadMode::Plaintext),
        },
        None if setting_enabled => Ok(StudioUploadMode::EncryptedNew),
        None => Ok(StudioUploadMode::Plaintext),
    }
}

pub const REMUX_DIR: &str = "e2ee-segments";
const REMUX_INDEX: &str = "remux.json";
const REMUX_INDEX_VERSION: u32 = 1;
const TARGET_SEGMENT_SECS: f64 = 2.0;

#[derive(Serialize, Deserialize)]
struct RemuxIndex {
    version: u32,
    has_audio: bool,
    events: Vec<IndexedEvent>,
}

#[derive(Serialize, Deserialize)]
struct IndexedEvent {
    path: String,
    index: u32,
    duration: f64,
    file_size: u64,
    is_init: bool,
    audio: bool,
}

pub struct PreparedSegments {
    pub events: Vec<SegmentCompletedEvent>,
    pub has_audio: bool,
}

pub fn remux_dir(project_dir: &Path) -> PathBuf {
    project_dir.join(REMUX_DIR)
}

pub fn remux_for_upload(source: &Path, project_dir: &Path) -> Result<PreparedSegments, String> {
    let out_dir = remux_dir(project_dir);
    match std::fs::remove_dir_all(&out_dir) {
        Ok(()) => {}
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => {}
        Err(error) => return Err(format!("Could not clear {}: {error}", out_dir.display())),
    }
    std::fs::create_dir_all(&out_dir)
        .map_err(|error| format!("Could not create {}: {error}", out_dir.display()))?;
    let remuxed = cap_enc_ffmpeg::remux_mp4_to_segments(source, &out_dir, TARGET_SEGMENT_SECS)
        .map_err(|error| format!("Could not prepare encrypted upload segments: {error}"))?;
    let events = remuxed
        .events
        .iter()
        .map(|event| {
            let relative = event
                .path
                .strip_prefix(&out_dir)
                .map_err(|_| "Remuxed segment is outside its directory".to_string())?;
            Ok(IndexedEvent {
                path: relative.to_string_lossy().replace('\\', "/"),
                index: event.index,
                duration: event.duration,
                file_size: event.file_size,
                is_init: event.is_init,
                audio: event.media_type == SegmentMediaType::Audio,
            })
        })
        .collect::<Result<Vec<_>, String>>()?;
    let index = RemuxIndex {
        version: REMUX_INDEX_VERSION,
        has_audio: remuxed.has_audio,
        events,
    };
    let temporary = out_dir.join(format!("{REMUX_INDEX}.tmp"));
    std::fs::write(
        &temporary,
        serde_json::to_vec_pretty(&index).map_err(|error| error.to_string())?,
    )
    .and_then(|()| std::fs::rename(&temporary, out_dir.join(REMUX_INDEX)))
    .map_err(|error| format!("Could not save the remux index: {error}"))?;
    Ok(PreparedSegments {
        events: remuxed.events,
        has_audio: remuxed.has_audio,
    })
}

pub fn load_remuxed_events(
    project_dir: &Path,
    required_audio: bool,
) -> Result<Option<Vec<SegmentCompletedEvent>>, String> {
    let out_dir = remux_dir(project_dir);
    let bytes = match std::fs::read(out_dir.join(REMUX_INDEX)) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error.to_string()),
    };
    let index: RemuxIndex = serde_json::from_slice(&bytes).map_err(|error| error.to_string())?;
    if index.version != REMUX_INDEX_VERSION {
        return Err("Unsupported remux index".into());
    }
    if required_audio && !index.has_audio {
        return Err("Required audio is missing from the remuxed recording".into());
    }
    let mut events = Vec::with_capacity(index.events.len());
    for entry in index.events {
        let relative = Path::new(&entry.path);
        if relative.is_absolute()
            || relative
                .components()
                .any(|part| !matches!(part, std::path::Component::Normal(_)))
        {
            return Err("Remux index lists an unsafe path".into());
        }
        let path = out_dir.join(relative);
        let size = std::fs::symlink_metadata(&path)
            .map_err(|error| format!("{}: {error}", path.display()))?
            .len();
        if size != entry.file_size || size == 0 {
            return Err(format!("{}: remuxed segment size changed", path.display()));
        }
        events.push(SegmentCompletedEvent {
            path,
            index: entry.index,
            duration: entry.duration,
            file_size: entry.file_size,
            is_init: entry.is_init,
            media_type: if entry.audio {
                SegmentMediaType::Audio
            } else {
                SegmentMediaType::Video
            },
        });
    }
    let has_video_segment = events
        .iter()
        .any(|event| !event.is_init && event.media_type == SegmentMediaType::Video);
    let has_video_init = events
        .iter()
        .any(|event| event.is_init && event.media_type == SegmentMediaType::Video);
    if !has_video_segment || !has_video_init {
        return Err("Remuxed recording has no video segments".into());
    }
    Ok(Some(events))
}

pub fn collect_events(
    project_dir: &Path,
    required_audio: bool,
) -> Result<Vec<SegmentCompletedEvent>, String> {
    match load_remuxed_events(project_dir, required_audio) {
        Ok(Some(events)) => return Ok(events),
        Ok(None) => {}
        Err(error) if rebuild_source(project_dir).is_none() => return Err(error),
        Err(error) => warn!(%error, "Remuxed segments are unusable, rebuilding them"),
    }
    if let Some(source) = rebuild_source(project_dir) {
        remux_for_upload(&source, project_dir)?;
        return load_remuxed_events(project_dir, required_audio)?
            .ok_or_else(|| "Remuxed segments are missing".to_string());
    }
    cap_recording::upload_resume::collect_segment_events(project_dir, required_audio)
}

fn rebuild_source(project_dir: &Path) -> Option<PathBuf> {
    let meta = RecordingMeta::load_for_project(project_dir).ok()?;
    let marked = upload_marked_e2ee(meta.upload.as_ref())
        && meta
            .sharing
            .as_ref()
            .is_some_and(|sharing| sharing.e2ee_key.is_some());
    let source = meta.output_path();
    (marked && !project_dir.join("content/display/manifest.json").exists() && source.is_file())
        .then_some(source)
}

pub async fn wait_for_stable_file(path: &Path) -> Result<(), String> {
    let mut last = None;
    for _ in 0..100 {
        let size = std::fs::metadata(path).ok().map(|meta| meta.len());
        if size.is_some_and(|size| size > 0) && size == last {
            return Ok(());
        }
        last = size;
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }
    Err(format!("{} never finished writing", path.display()))
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

    fn sharing(link: &str) -> SharingMeta {
        sharing_meta("abc".into(), link.into())
    }

    #[test]
    fn studio_mode_follows_the_share_not_just_the_setting() {
        let encrypted = sharing(&cap_e2ee::share_link(
            "https://screencap.co/s/abc",
            None,
            &key(),
        ));
        let plain = sharing("https://screencap.co/s/abc");
        for enabled in [true, false] {
            match studio_upload_mode(enabled, Some(&encrypted)).unwrap() {
                StudioUploadMode::EncryptedExisting(existing) => {
                    assert_eq!(existing.to_base64url(), key().to_base64url());
                }
                _ => panic!("an encrypted share must be re-uploaded encrypted"),
            }
            assert!(matches!(
                studio_upload_mode(enabled, Some(&plain)).unwrap(),
                StudioUploadMode::Plaintext
            ));
        }
        assert!(matches!(
            studio_upload_mode(true, None).unwrap(),
            StudioUploadMode::EncryptedNew
        ));
        assert!(matches!(
            studio_upload_mode(false, None).unwrap(),
            StudioUploadMode::Plaintext
        ));
    }

    #[test]
    fn studio_mode_refuses_an_unreadable_stored_key() {
        let mut broken = sharing("https://screencap.co/s/abc");
        broken.e2ee_key = Some("not a key".into());
        assert_eq!(
            studio_upload_mode(false, Some(&broken)).err().as_deref(),
            Some(MISSING_KEY_ERROR)
        );
    }

    fn generate_test_mp4(path: &Path) -> bool {
        let ffmpeg = Path::new("/opt/homebrew/bin/ffmpeg");
        if !ffmpeg.exists() {
            println!("skipping: /opt/homebrew/bin/ffmpeg is not installed");
            return false;
        }
        std::process::Command::new(ffmpeg)
            .args(["-v", "error", "-y", "-f", "lavfi", "-i"])
            .arg("testsrc=duration=7:size=320x240:rate=30")
            .args(["-f", "lavfi", "-i", "sine=frequency=440:duration=7"])
            .args(["-c:v", "libx264", "-g", "30", "-pix_fmt", "yuv420p"])
            .args(["-c:a", "aac", "-shortest"])
            .arg(path)
            .status()
            .is_ok_and(|status| status.success())
    }

    #[test]
    fn remuxed_mp4_yields_the_events_and_manifest_to_upload() {
        let project = tempfile::tempdir().unwrap();
        let source = project.path().join("result.mp4");
        if !generate_test_mp4(&source) {
            return;
        }

        let prepared = remux_for_upload(&source, project.path()).unwrap();
        assert!(prepared.has_audio);
        assert!(project.path().join(REMUX_DIR).join(REMUX_INDEX).is_file());

        for media_type in [SegmentMediaType::Video, SegmentMediaType::Audio] {
            let track: Vec<_> = prepared
                .events
                .iter()
                .filter(|event| event.media_type == media_type)
                .collect();
            assert!(track[0].is_init && track[0].index == 0);
            assert_eq!(
                segment_subpath(true, media_type, 0),
                match media_type {
                    SegmentMediaType::Video => "segments/video/init.mp4",
                    SegmentMediaType::Audio => "segments/audio/init.mp4",
                }
            );
            let indexes: Vec<u32> = track[1..].iter().map(|event| event.index).collect();
            assert!(indexes.len() >= 2, "expected several segments: {indexes:?}");
            assert_eq!(indexes, (1..=indexes.len() as u32).collect::<Vec<_>>());
            for event in &track {
                assert!(event.path.starts_with(project.path().join(REMUX_DIR)));
                assert_eq!(
                    std::fs::metadata(&event.path).unwrap().len(),
                    event.file_size
                );
                assert!(event.file_size > 0);
            }
            assert!(track[1..].iter().all(|event| event.duration > 0.0));
        }

        let loaded = collect_events(project.path(), true).unwrap();
        assert_eq!(loaded.len(), prepared.events.len());
        for (loaded, original) in loaded.iter().zip(&prepared.events) {
            assert_eq!(loaded.path, original.path);
            assert_eq!(loaded.index, original.index);
            assert_eq!(loaded.is_init, original.is_init);
            assert_eq!(loaded.media_type, original.media_type);
            assert_eq!(loaded.file_size, original.file_size);
            assert_eq!(loaded.duration, original.duration);
        }

        let manifest =
            serde_json::to_value(crate::upload::lifecycle::manifest_from_events(&loaded)).unwrap();
        assert_eq!(manifest["is_complete"], true);
        assert_eq!(manifest["video_init_uploaded"], true);
        assert_eq!(manifest["audio_init_uploaded"], true);
        let video_events: Vec<_> = prepared
            .events
            .iter()
            .filter(|event| !event.is_init && event.media_type == SegmentMediaType::Video)
            .collect();
        let listed = manifest["video_segments"].as_array().unwrap();
        assert_eq!(listed.len(), video_events.len());
        for (entry, event) in listed.iter().zip(&video_events) {
            assert_eq!(entry["index"], event.index);
            assert_eq!(entry["duration"], event.duration);
        }
        let total: f64 = video_events.iter().map(|event| event.duration).sum();
        assert!((total - 7.0).abs() < 0.5, "duration was {total}");
        assert_eq!(
            manifest["audio_segments"].as_array().unwrap().len(),
            prepared
                .events
                .iter()
                .filter(|event| !event.is_init && event.media_type == SegmentMediaType::Audio)
                .count()
        );

        let key = key();
        let init = prepared
            .events
            .iter()
            .find(|event| event.is_init && event.media_type == SegmentMediaType::Video)
            .unwrap();
        let plain = std::fs::read(&init.path).unwrap();
        let subpath = segment_subpath(true, SegmentMediaType::Video, 0);
        let encrypted = encrypt_for_upload(Some(&key), &subpath, Bytes::from(plain.clone()));
        assert_eq!(
            cap_e2ee::decrypt_object(&key, &subpath, &encrypted).unwrap(),
            plain
        );
    }

    #[test]
    fn remux_index_rejects_missing_audio_and_changed_files() {
        let project = tempfile::tempdir().unwrap();
        assert!(
            load_remuxed_events(project.path(), false)
                .unwrap()
                .is_none()
        );
        let source = project.path().join("result.mp4");
        if !generate_test_mp4(&source) {
            return;
        }
        let prepared = remux_for_upload(&source, project.path()).unwrap();
        assert!(load_remuxed_events(project.path(), true).unwrap().is_some());

        let again = remux_for_upload(&source, project.path()).unwrap();
        assert_eq!(again.events.len(), prepared.events.len());

        let last = again.events.last().unwrap();
        std::fs::write(&last.path, b"truncated").unwrap();
        assert!(load_remuxed_events(project.path(), true).is_err());
    }

    #[test]
    #[test]
    fn upload_keeps_the_stored_key_when_the_server_link_has_none() {
        let link = cap_e2ee::share_link("https://screencap.co/s/abc", None, &key());
        let existing = sharing_meta("abc".into(), link.clone());
        let after = sharing_after_upload(
            Some(&existing),
            "abc".into(),
            "https://screencap.co/s/abc".into(),
        );
        assert_eq!(after.link, link);
        assert_eq!(after.e2ee_key, Some(key().to_base64url()));
        let plain = sharing_after_upload(None, "abc".into(), "https://screencap.co/s/abc".into());
        assert!(plain.e2ee_key.is_none());
        assert_eq!(plain.link, "https://screencap.co/s/abc");
    }

    #[test]
    fn setting_is_ignored_off_macos() {
        assert_eq!(setting_enabled(true), cfg!(target_os = "macos"));
        assert!(!setting_enabled(false));
    }
}

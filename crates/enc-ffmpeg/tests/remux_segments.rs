use cap_enc_ffmpeg::{
    RemuxedSegments, remux_mp4_to_segments,
    segmented_stream::{SegmentCompletedEvent, SegmentMediaType},
};
use std::{
    path::{Path, PathBuf},
    process::Command,
};

const FFMPEG: &str = "/opt/homebrew/bin/ffmpeg";
const FFPROBE: &str = "/opt/homebrew/bin/ffprobe";
const INPUT_SECS: f64 = 7.0;

fn tools_available() -> bool {
    if Path::new(FFMPEG).exists() && Path::new(FFPROBE).exists() {
        true
    } else {
        println!("skipping: {FFMPEG} or {FFPROBE} not found");
        false
    }
}

fn make_fixture(dir: &Path, gop: u32, audio: bool) -> PathBuf {
    let path = dir.join("input.mp4");
    let mut command = Command::new(FFMPEG);
    command.args(["-v", "error", "-y", "-f", "lavfi", "-i"]);
    command.arg(format!(
        "testsrc=size=640x360:rate=30:duration={INPUT_SECS}"
    ));
    if audio {
        command.args(["-f", "lavfi", "-i"]);
        command.arg(format!(
            "sine=frequency=440:sample_rate=48000:duration={INPUT_SECS}"
        ));
    }
    command.args([
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-g",
        &gop.to_string(),
        "-keyint_min",
        &gop.to_string(),
        "-sc_threshold",
        "0",
    ]);
    if audio {
        command.args(["-c:a", "aac"]);
    }
    command.arg(&path);
    let output = command.output().unwrap();
    assert!(
        output.status.success(),
        "fixture failed: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    path
}

fn probe_duration(path: &Path) -> f64 {
    let output = Command::new(FFPROBE)
        .args(["-v", "error", "-show_entries", "format=duration", "-of"])
        .arg("csv=p=0")
        .arg(path)
        .output()
        .unwrap();
    assert!(
        output.status.success() && output.stderr.is_empty(),
        "ffprobe: {}",
        String::from_utf8_lossy(&output.stderr)
    );
    String::from_utf8_lossy(&output.stdout)
        .trim()
        .parse()
        .unwrap()
}

fn assert_decodes(path: &Path) {
    let output = Command::new(FFMPEG)
        .args(["-v", "error", "-i"])
        .arg(path)
        .args(["-f", "null", "-"])
        .output()
        .unwrap();
    assert!(
        output.status.success() && output.stderr.is_empty(),
        "decode errors for {}: {}",
        path.display(),
        String::from_utf8_lossy(&output.stderr)
    );
}

fn join(dir: &Path, name: &str, parts: &[&SegmentCompletedEvent]) -> PathBuf {
    let out = dir.join(name);
    let mut bytes = Vec::new();
    for part in parts {
        bytes.extend(std::fs::read(&part.path).unwrap());
    }
    std::fs::write(&out, bytes).unwrap();
    out
}

fn track(result: &RemuxedSegments, media_type: SegmentMediaType) -> Vec<&SegmentCompletedEvent> {
    result
        .events
        .iter()
        .filter(|e| e.media_type == media_type)
        .collect()
}

fn check_track(
    work: &Path,
    out_dir: &Path,
    result: &RemuxedSegments,
    media_type: SegmentMediaType,
    expect_dir: &str,
) -> Vec<f64> {
    let events = track(result, media_type);
    assert!(events[0].is_init);
    assert_eq!(events[0].index, 0);
    assert_eq!(events[0].path, out_dir.join(expect_dir).join("init.mp4"));
    assert!(events[0].file_size > 0);
    let segments = &events[1..];
    assert!(!segments.is_empty());
    for (i, segment) in segments.iter().enumerate() {
        assert!(!segment.is_init);
        assert_eq!(segment.index, i as u32 + 1);
        assert_eq!(
            segment.path,
            out_dir
                .join(expect_dir)
                .join(format!("segment_{:03}.m4s", i + 1))
        );
        assert_eq!(
            segment.file_size,
            std::fs::metadata(&segment.path).unwrap().len()
        );
        assert!(segment.duration > 0.0);
    }

    let all: Vec<&SegmentCompletedEvent> = events.clone();
    let joined = join(work, &format!("{expect_dir}-joined.mp4"), &all);
    assert_decodes(&joined);
    let duration = probe_duration(&joined);
    assert!(
        (duration - INPUT_SECS).abs() <= 0.15,
        "{expect_dir} joined duration {duration}"
    );

    let last = [events[0], *events.last().unwrap()];
    let tail = join(work, &format!("{expect_dir}-tail.mp4"), &last);
    assert_decodes(&tail);

    segments.iter().map(|s| s.duration).collect()
}

fn run_case(gop: u32, audio: bool, min_video_segments: usize, max_video_segments: usize) {
    if !tools_available() {
        return;
    }
    let work = tempfile::tempdir().unwrap();
    let input = make_fixture(work.path(), gop, audio);
    let out_dir = work.path().join("out");

    let result = remux_mp4_to_segments(&input, &out_dir, 3.0).unwrap();

    assert_eq!(result.has_audio, audio);
    assert!((result.duration - INPUT_SECS).abs() <= 0.1);

    let first_audio = result
        .events
        .iter()
        .position(|e| e.media_type == SegmentMediaType::Audio);
    let last_video = result
        .events
        .iter()
        .rposition(|e| e.media_type == SegmentMediaType::Video)
        .unwrap();
    assert!(result.events[0].is_init);
    assert_eq!(result.events[0].media_type, SegmentMediaType::Video);
    match first_audio {
        Some(position) => {
            assert!(audio);
            assert_eq!(position, last_video + 1);
            assert!(result.events[position].is_init);
        }
        None => assert!(!audio),
    }

    let video = check_track(
        work.path(),
        &out_dir,
        &result,
        SegmentMediaType::Video,
        "video",
    );
    assert!(
        (min_video_segments..=max_video_segments).contains(&video.len()),
        "video segments: {video:?}"
    );
    let video_total: f64 = video.iter().sum();
    assert!((video_total - INPUT_SECS).abs() <= 0.1, "{video:?}");

    if audio {
        let segments = check_track(
            work.path(),
            &out_dir,
            &result,
            SegmentMediaType::Audio,
            "audio",
        );
        let total: f64 = segments.iter().sum();
        assert!((total - INPUT_SECS).abs() <= 0.1, "{segments:?}");
    } else {
        assert!(!out_dir.join("audio").exists());
    }

    for dir in ["video", "audio"] {
        let dir = out_dir.join(dir);
        if dir.exists() {
            for entry in std::fs::read_dir(dir).unwrap() {
                let name = entry.unwrap().file_name().into_string().unwrap();
                assert!(
                    name == "init.mp4" || (name.starts_with("segment_") && name.ends_with(".m4s")),
                    "unexpected file {name}"
                );
            }
        }
    }
}

#[test]
fn remuxes_video_and_audio_with_two_second_gop() {
    run_case(60, true, 2, 3);
}

#[test]
fn remuxes_video_without_audio() {
    run_case(60, false, 2, 3);
}

#[test]
fn remuxes_with_ten_second_gop() {
    run_case(300, true, 1, 1);
}

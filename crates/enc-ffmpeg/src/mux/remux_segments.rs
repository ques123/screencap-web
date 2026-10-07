use super::{
    fragment_metadata::read_fragment_metadata,
    segmented_stream::{SegmentCompletedEvent, SegmentMediaType},
};
use ffmpeg::{format, media};
use std::{
    ffi::CString,
    path::{Path, PathBuf},
};

const INIT_SEGMENT_NAME: &str = "init.mp4";
const MICROS: ffmpeg::Rational = ffmpeg::Rational(1, 1_000_000);

#[derive(Debug, thiserror::Error)]
pub enum RemuxError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("FFmpeg error: {0}")]
    Ffmpeg(#[from] ffmpeg::Error),
    #[error("Input has no video stream")]
    NoVideoStream,
    #[error("Input path is not valid UTF-8: {0}")]
    InvalidPath(PathBuf),
    #[error("Muxer produced no segments for {0} track")]
    NoSegments(&'static str),
    #[error("Muxer output is missing for {0}")]
    MissingOutput(PathBuf),
}

#[derive(Debug, Clone)]
pub struct RemuxedSegments {
    pub events: Vec<SegmentCompletedEvent>,
    pub has_audio: bool,
    pub duration: f64,
}

struct Track {
    input_index: usize,
    input_time_base: ffmpeg::Rational,
    output: format::context::Output,
    output_time_base: ffmpeg::Rational,
    dir: PathBuf,
    media_type: SegmentMediaType,
}

pub fn remux_mp4_to_segments(
    input: &Path,
    out_dir: &Path,
    target_segment_secs: f64,
) -> Result<RemuxedSegments, RemuxError> {
    ffmpeg::init()?;

    let mut ictx = format::input(input)?;

    let video = ictx
        .streams()
        .best(media::Type::Video)
        .map(|s| (s.index(), s.time_base(), s.parameters()))
        .ok_or(RemuxError::NoVideoStream)?;
    let audio = ictx
        .streams()
        .best(media::Type::Audio)
        .map(|s| (s.index(), s.time_base(), s.parameters()));

    let target = if target_segment_secs.is_finite() && target_segment_secs > 0.0 {
        target_segment_secs
    } else {
        3.0
    };

    let mut tracks = vec![open_track(
        video.0,
        video.1,
        video.2,
        out_dir.join("video"),
        SegmentMediaType::Video,
        target,
    )?];
    if let Some((index, time_base, parameters)) = audio {
        tracks.push(open_track(
            index,
            time_base,
            parameters,
            out_dir.join("audio"),
            SegmentMediaType::Audio,
            target,
        )?);
    }
    let has_audio = tracks.len() > 1;

    let mut first_dts: Vec<Option<i64>> = vec![None; tracks.len()];
    let mut origin_us = i64::MAX;
    for (stream, packet) in ictx.packets() {
        let Some(slot) = tracks.iter().position(|t| t.input_index == stream.index()) else {
            continue;
        };
        if first_dts[slot].is_none()
            && let Some(ts) = packet.dts().or(packet.pts())
        {
            first_dts[slot] = Some(ts);
            origin_us = origin_us.min(rescale(ts, stream.time_base(), MICROS));
        }
        if first_dts.iter().all(Option::is_some) {
            break;
        }
    }
    if origin_us == i64::MAX {
        origin_us = 0;
    }

    ictx.seek(i64::MIN, ..)?;
    for (stream, mut packet) in ictx.packets() {
        let Some(track) = tracks.iter_mut().find(|t| t.input_index == stream.index()) else {
            continue;
        };
        let shift_input = rescale(origin_us, MICROS, track.input_time_base);
        if let Some(dts) = packet.dts() {
            packet.set_dts(Some(dts - shift_input));
        }
        if let Some(pts) = packet.pts() {
            packet.set_pts(Some(pts - shift_input));
        }
        packet.rescale_ts(track.input_time_base, track.output_time_base);
        packet.set_stream(0);
        packet.set_position(-1);
        packet.write_interleaved(&mut track.output)?;
    }

    let mut events = Vec::new();
    let mut video_duration = 0.0;
    for mut track in tracks {
        track.output.write_trailer()?;
        let track_events = collect_events(&track.dir, track.media_type)?;
        if track.media_type == SegmentMediaType::Video {
            video_duration = track_events
                .iter()
                .filter(|e| !e.is_init)
                .map(|e| e.duration)
                .sum();
        }
        events.extend(track_events);
        let _ = std::fs::remove_file(track.dir.join("dash_manifest.mpd"));
    }

    Ok(RemuxedSegments {
        events,
        has_audio,
        duration: video_duration,
    })
}

fn rescale(value: i64, from: ffmpeg::Rational, to: ffmpeg::Rational) -> i64 {
    unsafe { ffmpeg::ffi::av_rescale_q(value, from.into(), to.into()) }
}

fn open_track(
    input_index: usize,
    input_time_base: ffmpeg::Rational,
    parameters: ffmpeg::codec::Parameters,
    dir: PathBuf,
    media_type: SegmentMediaType,
    target_segment_secs: f64,
) -> Result<Track, RemuxError> {
    if dir.exists() {
        std::fs::remove_dir_all(&dir)?;
    }
    std::fs::create_dir_all(&dir)?;

    let manifest = dir.join("dash_manifest.mpd");
    let manifest_str = manifest
        .to_str()
        .ok_or_else(|| RemuxError::InvalidPath(manifest.clone()))?
        .replace('\\', "/");

    let mut output = super::dash_output::create(&manifest_str)?;

    unsafe {
        let context = output.as_mut_ptr();
        let set_opt = |key: &str, value: &str| {
            let k = CString::new(key).unwrap();
            let v = CString::new(value).unwrap();
            ffmpeg::ffi::av_opt_set((*context).priv_data, k.as_ptr(), v.as_ptr(), 0);
        };
        set_opt("init_seg_name", INIT_SEGMENT_NAME);
        set_opt("media_seg_name", "segment_$Number%03d$.m4s");
        set_opt("seg_duration", &target_segment_secs.to_string());
        set_opt("use_timeline", "1");
        set_opt("use_template", "1");
        set_opt("single_file", "0");
    }

    {
        let mut stream = output.add_stream(None)?;
        stream.set_parameters(parameters);
        unsafe {
            (*stream.as_mut_ptr()).time_base = input_time_base.into();
            (*(*stream.as_mut_ptr()).codecpar).codec_tag = 0;
        }
    }

    output.write_header()?;
    let output_time_base = output
        .stream(0)
        .ok_or(ffmpeg::Error::StreamNotFound)?
        .time_base();

    Ok(Track {
        input_index,
        input_time_base,
        output,
        output_time_base,
        dir,
        media_type,
    })
}

fn collect_events(
    dir: &Path,
    media_type: SegmentMediaType,
) -> Result<Vec<SegmentCompletedEvent>, RemuxError> {
    let label = match media_type {
        SegmentMediaType::Video => "video",
        SegmentMediaType::Audio => "audio",
    };

    let init_path = dir.join(INIT_SEGMENT_NAME);
    let init_size = std::fs::metadata(&init_path)
        .map_err(|_| RemuxError::MissingOutput(init_path.clone()))?
        .len();

    let mut segments: Vec<(u32, PathBuf)> = std::fs::read_dir(dir)?
        .filter_map(|entry| {
            let path = entry.ok()?.path();
            let name = path.file_name()?.to_str()?;
            let index = name
                .strip_prefix("segment_")?
                .strip_suffix(".m4s")?
                .parse::<u32>()
                .ok()?;
            Some((index, path))
        })
        .collect();
    segments.sort_by_key(|(index, _)| *index);
    if segments.is_empty() {
        return Err(RemuxError::NoSegments(label));
    }

    let mut events = vec![SegmentCompletedEvent {
        path: init_path,
        index: 0,
        duration: 0.0,
        file_size: init_size,
        is_init: true,
        media_type,
    }];
    for (index, path) in segments {
        let metadata = read_fragment_metadata(&path)?;
        events.push(SegmentCompletedEvent {
            path,
            index,
            duration: metadata.duration.as_secs_f64(),
            file_size: metadata.file_size,
            is_init: false,
            media_type,
        });
    }
    Ok(events)
}

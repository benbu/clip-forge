# Export Performance Roadmap

## Native FFmpeg Integration
- Move export workload to Electron main process and spawn system ffmpeg.
- Stream data via temp files or IPC to avoid copying large buffers.
- Surface real-time progress and ensure sandboxed file writes.
- Add platform checks for bundled ffmpeg binaries or system requirements.
- Prefer a single-pass pipeline per export to avoid N× re-encodes:
  - Use one `filter_complex` with `enable='between(t,...)'` for overlays across the entire timeline.
  - When no filters are needed, use concat demuxer with `-c copy` to avoid re-encoding.
- Use hardware encoders when available for large exports; fallback to CPU:
  - NVIDIA: `h264_nvenc`/`hevc_nvenc`
  - Intel: `h264_qsv`/`hevc_qsv`
  - AMD: `h264_amf`/`hevc_amf`
  - Fallback: `libx264`/`libx265`
- Force keyframes at cut points when needed: `-force_key_frames` at segment boundaries.
- Always finalize with `-movflags faststart` and `-shortest` for streaming-friendly MP4s.

## Multi-threaded WASM Build
- Explore @ffmpeg/core-mt with SharedArrayBuffer support.
- Update Electron security headers (crossOriginIsolation) to enable SAB.
- Measure CPU usage vs. single-thread build, guard for older hardware.
- For intermediate WASM encodes, use `-preset ultrafast` and CRF ~23 to minimize time.
- Avoid audio re-encoding in intermediate steps; add/mux audio once at the end.

## Preset & Quality Controls
- Expose encoding preset sliders (draft/preview vs. production).
- Offer auto-preset selection based on output resolution.
- Cache pre-rendered segments for incremental exports.
- Default export: 1080p at 60 fps; allow user override in Settings and export modal.
- Apply scaling (e.g., `scale=1920x1080`) and `fps=60` at the final export stage only.

## Export Pipeline Optimizations
- Stream clips directly from disk instead of loading into memory.
- Batch trim/concatenate operations to minimize re-encoding.
- Persist intermediate artifacts to skip redundant renders.
- Prefer stream-copy trims for MP4 where possible (`-ss/-to ... -c copy`), with re-encode fallback.
- For overlay workflows:
  - Encode video-only segments (no audio) for each overlay interval.
  - Concatenate video segments, then mux audio once from the base input: keep video `-c:v copy`, encode audio once `-c:a aac -b:a 192k`.
  - This removes repeated audio encodes per segment and significantly reduces total work.
- Defer pixel format changes until the final step; only enforce `-pix_fmt yuv420p` at output unless required earlier.

## Testing & Monitoring
- Add benchmark suite comparing native vs. wasm throughput.
- Log encode durations and success rates for telemetry.


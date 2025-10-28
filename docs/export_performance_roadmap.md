# Export Performance Roadmap

## Native FFmpeg Integration
- Move export workload to Electron main process and spawn system ffmpeg.
- Stream data via temp files or IPC to avoid copying large buffers.
- Surface real-time progress and ensure sandboxed file writes.
- Add platform checks for bundled ffmpeg binaries or system requirements.

## Multi-threaded WASM Build
- Explore @ffmpeg/core-mt with SharedArrayBuffer support.
- Update Electron security headers (crossOriginIsolation) to enable SAB.
- Measure CPU usage vs. single-thread build, guard for older hardware.

## Preset & Quality Controls
- Expose encoding preset sliders (draft/preview vs. production).
- Offer auto-preset selection based on output resolution.
- Cache pre-rendered segments for incremental exports.

## Export Pipeline Optimizations
- Stream clips directly from disk instead of loading into memory.
- Batch trim/concatenate operations to minimize re-encoding.
- Persist intermediate artifacts to skip redundant renders.

## Testing & Monitoring
- Add benchmark suite comparing native vs. wasm throughput.
- Log encode durations and success rates for telemetry.


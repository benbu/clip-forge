# ClipForge Remaining Features Task List

## Overview
Now that the MVP scope is delivered, this list captures every outstanding capability promised in the PRD (v1.1, Oct 27 2025). Tasks are grouped by feature area and assume the current Electron + React architecture (`src/main`, `src/preload/bridge.js`, `src/renderer`, `src/media`, `src/recorder`). Prioritize sections 1–5 to reach feature completeness, then tackle the stretch goals.

## 1. Recording Enhancements
- [ ] Build a screen/window picker modal that surfaces `desktopCapturer.getSources()` results with live thumbnails, search, and permission prompts before starting a capture session.
- [ ] Add simultaneous screen + webcam capture with picture-in-picture layout controls (corner position presets, drag-to-reposition, resize) and persist the overlay choice per recording.
- [ ] Implement audio input routing: microphone source selection, input level meter (Web Audio API), and per-track mute toggles before/during recording.
- [ ] Introduce a recording session controller (countdown, pause/resume, elapsed timer) anchored in the top bar and mirrored in system tray/status.
- [ ] Automatically import finished recordings into the media library with generated thumbnails, duration/size metadata, and a link back to the source file location.

## 2. Media Library & Asset Management
- [ ] Expand the media library panel with sortable columns (name, duration, resolution, size, import date) and quick filters for recordings vs. external clips.
- [ ] Add a clip detail drawer that exposes metadata, allows renaming, and lists every timeline track where the clip is used.
- [ ] Implement asynchronous thumbnail generation with caching and background invalidation when source files change.
- [ ] Provide a missing-media workflow: detect offline assets on app launch and let users relink files via `dialog.showOpenDialog`.
- [ ] Support bulk actions (multi-select, batch delete, add to timeline) with keyboard modifiers and confirmation prompts.

## 3. Timeline & Editing Upgrades
- [x] Extend the timeline to support multiple synchronized video tracks plus at least one dedicated audio track; update `timelineStore` schema accordingly.
- [ ] Enable overlay layers for PiP clips with transform handles (position, scale) that feed into export compositing.
- [ ] Render audio waveforms for timeline clips using precomputed peak data and allow per-clip gain adjustments.
- [x] Add track-level controls: lock, mute/solo, visibility toggles, and adjustable track heights.
- [ ] Implement ripple editing and intelligent gap handling when clips are trimmed or removed.
- [ ] Improve timeline zooming with mousewheel + modifier shortcuts and a minimap for quick navigation.

## 4. Export & Delivery Improvements
- [ ] Expand export presets beyond the MVP: add social-ready formats (Square 1080x1080, Vertical 1080x1920), bitrate presets, and frame-rate selection.
- [ ] Surface an export summary screen (timeline duration, selected clips, output path) with editable metadata (title, project notes).
- [ ] Provide an export queue so multiple timelines/renders can process sequentially with pause/cancel support.
- [ ] Integrate real-time progress and ETA updates from the FFmpeg worker into the UI, including error retry prompts and log download.
- [ ] Validate exported files post-render (basic probe to confirm duration/fps) and offer "Reveal in Finder/Explorer" shortcuts.

## 5. Performance, Observability, and Reliability
- [ ] Profile playback and timeline interactions with 10+ clips; capture FPS and JS heap metrics, then optimize hotspots (virtualization, memoization).
- [ ] Move heavy FFmpeg operations onto dedicated worker threads/processes to keep the renderer responsive and monitor worker crashes.
- [ ] Implement structured logging and crash reporting hooks (local log files, optional diagnostics export) respecting user privacy.
- [ ] Add configurable autosave intervals with versioned project backups and recovery prompts after crashes.
- [ ] Establish resource guardrails (disk space warnings before export, RAM usage monitoring) to avoid exceeding the 1 GB memory target.

## 6. QA, Tooling, and Release Readiness
- [x] Stand up Vitest + React Testing Library for unit/integration coverage of state stores, timeline math, and recording utilities.
- [x] Script an end-to-end smoke test that automates import → edit → export using Playwright or Spectron in CI.
- [x] Flesh out the manual regression checklist covering recording permutations, multi-track editing, export presets, and packaging.
- [x] Update build pipelines for macOS and Windows installers, and add a Linux AppImage build leveraging the existing electron-builder setup.
- [ ] Produce an updated 3–5 minute demo video that walks through the post-MVP feature set for launch marketing.

## 7. Stretch Goals (From PRD §7)
- [ ] Implement text overlays/annotations with styling controls and timeline keyframes for in/out timing.
- [ ] Add transition effects (crossfade, dip to black, slide) with adjustable durations and easing curves.
- [ ] Expand audio controls: per-clip volume envelopes, fade in/out presets, and master bus level meter.
- [ ] Ship preset export templates for major platforms (YouTube 4K, TikTok 1080x1920@60fps, LinkedIn 1080p) with saved defaults.
- [ ] Introduce a robust undo/redo stack for timeline, media library, and export configuration changes.
- [ ] Broaden keyboard shortcut coverage (playback, insertion, tool switching) with an in-app shortcut reference panel.

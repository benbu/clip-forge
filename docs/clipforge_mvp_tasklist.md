# ClipForge MVP Task List

## Overview
This task list outlines every major and minor step required to complete the **ClipForge MVP** after the base Electron app shell has been manually set up. It assumes an Electron + React project scaffold with the main process and renderer ready, and focuses on feature implementation, FFmpeg integration, UI creation, testing, and packaging.

---

## 1. Project Initialization

### 1.1 File & Directory Structure
- [ ] Create core directories:
  - `/src/main` → Electron main process logic
  - `/src/renderer` → React components and pages
  - `/src/renderer/components` → UI components (Timeline, Player, Media Library)
  - `/src/renderer/state` → App state management (Redux or Zustand)
  - `/src/media` → FFmpeg worker scripts
  - `/src/recorder` → screen/webcam recorder modules
  - `/assets` → icons, logos, placeholder media

### 1.2 Configure Entry Points
- [ ] Confirm `main.js` or `main.ts` handles window creation and preload script.
- [ ] Set up `preload.js` for secure IPC communication between renderer and main process.
- [ ] Verify hot reload and dev build scripts in `package.json`.

---

## 2. FFmpeg Integration

### 2.1 Setup FFmpeg
- [ ] Install dependencies: `@ffmpeg/ffmpeg` and `@ffmpeg/core`.
- [ ] Create `/src/media/ffmpegWorker.js`.
- [ ] Initialize FFmpeg in worker thread:
  ```js
  import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
  ```
- [ ] Implement functions for:
  - Video trimming (set in/out points)
  - Concatenation of multiple clips
  - Exporting to MP4
- [ ] Add error handling for missing binaries or failed encodes.

### 2.2 Testing FFmpeg
- [ ] Verify import/export workflow with small sample MP4s.
- [ ] Add progress logging and UI hooks for encoding feedback.

---

## 3. Media Import System

### 3.1 File Input
- [ ] Implement drag-and-drop zone (`<input type="file" multiple />`).
- [ ] Add file picker with `electron.dialog.showOpenDialog` fallback.

### 3.2 File Metadata Extraction
- [ ] Parse metadata (duration, resolution, file size) via FFprobe or HTML5 video element.
- [ ] Store clip info in global state (`mediaStore`).

### 3.3 Media Library UI
- [ ] Create `MediaLibrary.tsx` component.
- [ ] Display imported clips as thumbnails.
- [ ] Include metadata and delete buttons.

---

## 4. Video Player

### 4.1 Implementation
- [ ] Create `VideoPlayer.tsx` using HTML5 `<video>` element.
- [ ] Implement basic controls: Play, Pause, Seek.
- [ ] Sync playhead updates to timeline component.

### 4.2 Integration
- [ ] Add global currentTime state synced with Timeline.
- [ ] Ensure playback reflects trimmed in/out points.

---

## 5. Timeline Editor

### 5.1 Core Structure
- [ ] Create `Timeline.tsx` component.
- [ ] Render imported clips as draggable items.
- [ ] Display playhead and time ruler.

### 5.2 Interaction Features
- [ ] Implement drag-to-reorder functionality.
- [ ] Add trim handles for start/end adjustments.
- [ ] Add split button at playhead position.
- [ ] Implement delete button for removing clips.
- [ ] Add zoom in/out slider for precision editing.

### 5.3 Snapping & Alignment
- [ ] Enable snapping to grid and clip edges.
- [ ] Add visual highlight when clips align.

---

## 6. Screen & Webcam Recording

### 6.1 Screen Recording
- [ ] Use Electron’s `desktopCapturer` API to list available screens/windows.
- [ ] Create a UI modal to select source.
- [ ] Pass selected stream to `navigator.mediaDevices.getUserMedia`.

### 6.2 Webcam Recording
- [ ] Use `getUserMedia({ video: true, audio: true })` for webcam + mic.
- [ ] Display webcam preview in corner of player (PiP mode).

### 6.3 Recorder Controls
- [ ] Add Record, Stop, Save buttons.
- [ ] Save recordings as temporary files in `~/AppData/ClipForge/temp` or equivalent.
- [ ] Automatically import saved recording to media library.

---

## 7. Export System

### 7.1 Export Options UI
- [ ] Create `ExportPanel.tsx`.
- [ ] Allow selection of resolution: 720p / 1080p / Source.
- [ ] Show estimated file size and duration.

### 7.2 Export Logic
- [ ] Concatenate clips in timeline order.
- [ ] Apply trim metadata before encoding.
- [ ] Display progress indicator with FFmpeg status updates.
- [ ] Save final MP4 via Electron `dialog.showSaveDialog`.

---

## 8. App State Management

### 8.1 Store Setup
- [ ] Use Zustand or Redux for global state.
- [ ] Define slices:
  - `mediaStore` → imported files, metadata
  - `timelineStore` → clip order, trims, playhead
  - `playerStore` → playback state, current time

### 8.2 Persistence
- [ ] Add optional auto-save to JSON project files.
- [ ] Restore last session on app launch.

---

## 9. UI Polish & Layout

### 9.1 Layout
- [ ] Main layout with 3 sections:
  - Left: Media Library
  - Center: Player
  - Bottom: Timeline
- [ ] Add top menu bar (File, Edit, Export).

### 9.2 Theming
- [ ] Implement dark mode styling (Tailwind or CSS Modules).
- [ ] Ensure icons and text have accessible contrast.

---

## 10. Testing & Validation

### 10.1 Functional Tests
- [ ] Import multiple clips (MP4, MOV).
- [ ] Play and scrub through timeline.
- [ ] Trim and reorder clips.
- [ ] Record 30-second screen and webcam video.
- [ ] Export merged MP4.

### 10.2 Performance
- [ ] Verify smooth playback (≥30 FPS).
- [ ] Confirm timeline responsiveness with 10+ clips.
- [ ] Test export under various resolutions.

---

## 11. Packaging

### 11.1 Electron Builder Setup
- [ ] Install `electron-builder`.
- [ ] Add build config to `package.json`:
  ```json
  {
    "build": {
      "appId": "com.clipforge.editor",
      "productName": "ClipForge",
      "files": ["dist/**/*", "package.json"],
      "mac": { "target": ["dmg"] },
      "win": { "target": ["nsis"] }
    }
  }
  ```
- [ ] Test build on both macOS and Windows.
- [ ] Verify packaged app launches successfully.

### 11.2 README & Demo
- [ ] Write setup and usage instructions.
- [ ] Record demo video showing import → edit → export flow.

---

## ✅ Completion Criteria
- Functional Electron app with:
  - [x] Working import, playback, trimming, and export.
  - [x] Basic timeline editor.
  - [x] Screen and webcam recording.
  - [x] Packaged installer for Windows and macOS.
- No critical bugs or crashes during editing/export.
- Exported videos play correctly and match timeline edits.

---

**Document Version:** v1.0  
**Author:** Mitchel Valeo  
**Last Updated:** October 27, 2025


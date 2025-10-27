# ClipForge MVP Task List

## Overview
This task list outlines every major and minor step required to complete the **ClipForge MVP** after the base Electron app shell has been manually set up. It assumes an Electron + React project scaffold with the main process and renderer ready, and focuses on feature implementation, FFmpeg integration, UI creation, testing, and packaging.

---

## 1. Project Initialization

### 1.1 File & Directory Structure
- [x] Create core directories:
  - `/src/main` → Electron main process logic
  - `/src/renderer` → React components and pages
  - `/src/renderer/components` → UI components (Timeline, Player, Media Library)
  - `/src/renderer/state` → App state management (Redux or Zustand)
  - `/src/media` → FFmpeg worker scripts
  - `/src/recorder` → screen/webcam recorder modules
  - `/assets` → icons, logos, placeholder media

### 1.2 Configure Entry Points
- [x] Confirm `main.js` or `main.ts` handles window creation and preload script.
- [x] Set up `preload.js` for secure IPC communication between renderer and main process.
- [x] Verify hot reload and dev build scripts in `package.json`.

---

## 2. UI/Design System Setup

### 2.1 Design Foundation
- [x] Establish color palette (dark mode focused, modern accent colors).
- [x] Choose typography system (modern sans-serif fonts).
- [x] Define spacing scale and layout grid.
- [x] Create design tokens for consistency.

### 2.2 Component Library Setup
- [x] Install UI framework (Tailwind CSS recommended for rapid, beautiful styling).
- [x] Create base component styles: buttons, inputs, panels, cards.
- [x] Implement sleek, minimal design aesthetic throughout.
- [x] Design glassmorphism or subtle shadow effects for depth.

### 2.3 Layout Architecture
- [x] Design responsive 3-panel layout (Media Library, Player, Timeline).
- [x] Create modern top menu bar with subtle styling.
- [x] Implement smooth transitions and micro-interactions.
- [x] Ensure minimal, distraction-free interface that highlights content.

### 2.4 Icons & Assets
- [x] Select or create modern icon set (Lucide, Heroicons, or custom).
- [x] Design app logo and branding elements.
- [x] Create placeholder assets for empty states.

---

## 3. FFmpeg Integration

### 3.1 Setup FFmpeg
- [x] Install dependencies: `@ffmpeg/ffmpeg` and `@ffmpeg/core`.
- [x] Create `/src/media/ffmpegWorker.js`.
- [x] Initialize FFmpeg in worker thread:
  ```js
  import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';
  ```
- [x] Implement functions for:
  - Video trimming (set in/out points)
  - Concatenation of multiple clips
  - Exporting to MP4
- [x] Add error handling for missing binaries or failed encodes.

### 3.2 Testing FFmpeg
- [ ] Verify import/export workflow with small sample MP4s.
- [ ] Add progress logging and UI hooks for encoding feedback.

---

## 4. Media Import System

### 4.1 File Input
- [x] Implement drag-and-drop zone (`<input type="file" multiple />`).
- [ ] Add file picker with `electron.dialog.showOpenDialog` fallback.

### 4.2 File Metadata Extraction
- [x] Parse metadata (duration, resolution, file size) via FFprobe or HTML5 video element.
- [x] Store clip info in global state (`mediaStore`).

### 4.3 Media Library UI
- [x] Create `MediaLibrary.tsx` component.
- [x] Display imported clips as thumbnails.
- [x] Include metadata and delete buttons.

---

## 5. Video Player

### 5.1 Implementation
- [x] Create `VideoPlayer.tsx` using HTML5 `<video>` element.
- [x] Implement basic controls: Play, Pause, Seek.
- [x] Sync playhead updates to timeline component.

### 5.2 Integration
- [x] Add global currentTime state synced with Timeline.
- [ ] Ensure playback reflects trimmed in/out points.

---

## 6. Timeline Editor

### 6.1 Core Structure
- [x] Create `Timeline.tsx` component.
- [x] Render imported clips as draggable items.
- [x] Display playhead and time ruler.

### 6.2 Interaction Features
- [x] Implement drag-to-reorder functionality.
- [x] Add trim handles for start/end adjustments.
- [x] Add split button at playhead position.
- [x] Implement delete button for removing clips.
- [x] Add zoom in/out slider for precision editing.

### 6.3 Snapping & Alignment
- [x] Enable snapping to grid and clip edges.
- [x] Add visual highlight when clips align.

---

## 7. Screen & Webcam Recording

### 7.1 Screen Recording
- [x] Use Electron's `desktopCapturer` API to list available screens/windows.
- [ ] Create a UI modal to select source.
- [x] Pass selected stream to `navigator.mediaDevices.getUserMedia`.

### 7.2 Webcam Recording
- [x] Use `getUserMedia({ video: true, audio: true })` for webcam + mic.
- [ ] Display webcam preview in corner of player (PiP mode).

### 7.3 Recorder Controls
- [x] Add Record, Stop, Save buttons.
- [x] Save recordings as temporary files in `~/AppData/ClipForge/temp` or equivalent.
- [ ] Automatically import saved recording to media library.

---

## 8. Export System

### 8.1 Export Options UI
- [x] Create `ExportPanel.tsx`.
- [x] Allow selection of resolution: 720p / 1080p / 4k / Source.
- [x] Show estimated file size and duration.

### 8.2 Export Logic
- [x] Concatenate clips in timeline order.
- [x] Apply trim metadata before encoding.
- [x] Display progress indicator with FFmpeg status updates.
- [x] Save final MP4 via Electron `dialog.showSaveDialog`.

---

## 9. App State Management

### 9.1 Store Setup
- [x] Use Zustand or Redux for global state.
- [x] Define slices:
  - `mediaStore` → imported files, metadata
  - `timelineStore` → clip order, trims, playhead
  - `playerStore` → playback state, current time

### 9.2 Persistence
- [x] Add optional auto-save to JSON project files.
- [x] Restore last session on app launch.

---

## 10. UI Polish & Refinement

### 10.1 Final Visual Polish
- [x] Review and refine all component spacing and alignment.
- [x] Ensure consistent hover states and interactions across all UI elements.
- [x] Add smooth animations for modals, panels, and transitions.
- [x] Verify visual hierarchy guides user attention appropriately.

### 10.2 Accessibility & UX
- [x] Ensure keyboard navigation works throughout the app.
- [x] Add tooltips for all interactive elements.
- [ ] Verify color contrast meets accessibility standards (WCAG AA).
- [x] Test UI with different screen sizes and zoom levels.

---

## 11. Testing & Validation

### 11.1 Functional Tests
- [ ] Import multiple clips (MP4, MOV).
- [ ] Play and scrub through timeline.
- [ ] Trim and reorder clips.
- [ ] Record 30-second screen and webcam video.
- [ ] Export merged MP4.

### 11.2 Performance
- [ ] Verify smooth playback (≥30 FPS).
- [ ] Confirm timeline responsiveness with 10+ clips.
- [ ] Test export under various resolutions.

---

## 12. Packaging

### 12.1 Electron Builder Setup
- [x] Install `electron-builder`.
- [x] Add build config to `package.json`:
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
- [x] Test build on both macOS and Windows.
- [x] Verify packaged app launches successfully.

### 12.2 README & Demo
- [x] Write setup and usage instructions.
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


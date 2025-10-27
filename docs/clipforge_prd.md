**Product Requirements Document (PRD)**

# ClipForge: Desktop Video Editor

---

## 1. Overview

**Project Name:** ClipForge  
**Objective:** Build a production-grade desktop video editor using Electron.  
**Goal:** Enable creators to record, edit, and export videos seamlessly on desktop.

**Core Concept:** Deliver an intuitive, high-performance, native desktop application capable of:
- Screen & Window & webcam recording
- Multi-clip timeline editing supporting multiple video and audio tracks
- Real-time video preview
- MP4 export

---

## 2. Problem Statement

ClipForge offers a simple yet capable desktop editor that emphasizes the *core creative loop*:  
**Record → Import → Arrange → Export.**

---

## 3. Objectives & Key Results (OKRs)

**Primary Objectives:**
1. Build a working Electron app that supports import, playback, trimming, and export of MP4 clips.
2. Implement screen and webcam recording.
3. Deliver a functional timeline UI that supports drag-and-drop editing.
4. Package and distribute the app as a native executable for both Windows and macOS.

**Key Results:**
- MVP feature set operational and stable.
- Reliable export pipeline using FFmpeg.
- Timeline can handle 10+ clips responsively.
- Exported video plays at 30+ FPS without stutter.

---

## 4. Target Users

**Primary Users:**
- Content creators and streamers
- Educators and online instructors
- Professionals creating presentation videos
- Indie developers producing demos

**User Goals:**
- Quickly record and edit tutorial or demo videos.
- Combine multiple clips into cohesive content.
- Export videos for platforms like YouTube or LinkedIn.

---

## 5. Product Scope

### In Scope
- Desktop app (Electron framework)
- MP4/MOV/WebM file import and preview
- Video timeline editing (trim, split, delete, drag)
- Screen + webcam recording
- Video export using FFmpeg
- Real-time playback and scrubbing
- Basic multi-track support (video + overlay)

### Out of Scope
- Cloud storage integration
- Advanced effects or transitions
- AI-assisted editing
- Multi-language localization

---

## 6. Core Features

### 6.1 MVP Features
- Electron desktop app launchable on Windows/macOS
- Import video clips via drag-and-drop or file picker
- Timeline view showing imported clips visually
- Preview player for playback of selected clips
- Trim functionality (set in/out points)
- Export to MP4 format
- App packaged into distributable installer

### 6.2 Core Features
#### Recording
- Screen recording (desktopCapturer API)
- Webcam capture (navigator.mediaDevices.getUserMedia)
- Audio capture from microphone
- Picture-in-picture mode (webcam overlay on screen capture)

#### Media Management
- Drag-and-drop or file picker import
- Thumbnail and metadata display (duration, size, resolution)
- Organized media library panel

#### Timeline Editing
- Draggable clips with snapping and sequencing
- Playhead control and scrubbing
- Multi-track (main + overlay)
- Trim, split, and delete actions
- Zoom in/out on timeline

#### Export & Sharing
- Encode and export via FFmpeg
- Resolution presets: 720p, 1080p, or source
- Progress indicator during export
- Save output to local filesystem

---

## 7. Stretch Goals
- Text overlays and annotations
- Transition effects (fade, slide)
- Audio control (volume, fade in/out)
- Export presets for social platforms
- Undo/Redo support
- Auto-save project state
- Keyboard shortcuts

---

## 8. Technical Architecture

### Framework
- **Frontend:** Electron + React (or Vanilla JS + HTML/CSS for speed)
- **Media Engine:** FFmpeg (via @ffmpeg/ffmpeg or fluent-ffmpeg)
- **Timeline Rendering:** Konva.js or custom HTML5 Canvas solution
- **Storage:** Local filesystem (using Node fs module)

### Key Modules
1. **App Shell:** Electron main process (window management, IPC)
2. **Renderer:** React UI with modular components (Timeline, Player, Media Library)
3. **Media Worker:** FFmpeg wrapper handling encoding, trimming, and export
4. **Recorder:** Screen and webcam recording integration using desktopCapturer & getUserMedia
5. **Timeline State:** Redux/Zustand for managing clips, in/out points, and metadata

### File Structure (Proposed)
```
/clipforge
├── /public
│   └── index.html
├── /src
│   ├── main/ (Electron main process)
│   ├── renderer/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── state/
│   ├── media/
│   │   └── ffmpegWorker.js
│   └── recorder/
│       └── screenRecorder.js
├── package.json
├── ffmpeg-config.js
└── README.md
```

---

## 9. UX & UI Design

### Key Views
1. **Home / Dashboard:** Import or Record new clips.
2. **Editor View:**
   - Left: Media Library
   - Center: Video Preview
   - Bottom: Timeline Editor
   - Right: Export Settings

### Design Principles
- Clean, minimal, creator-friendly layout
- Contextual tooltips for first-time users
- Smooth transitions and drag interactions
- Consistent color palette (dark mode preferred)

---

## 10. Performance Targets
- Launch time under 5 seconds
- Real-time playback at 30 FPS minimum
- Timeline responsive with 10+ clips
- Export 2-minute clip under 30 seconds
- Memory stable under 1GB during editing

---

## 11. Testing & QA

### Test Cases
1. Import 3 clips and arrange on timeline
2. Record a 30-second screen capture
3. Trim and split clips accurately
4. Overlay webcam video on screen capture
5. Export combined video successfully
6. Test build on Windows and macOS

### Acceptance Criteria
- App runs natively on both OSes
- No crashes during import/export
- Exported videos play correctly

---

## 12. Deliverables
- GitHub repository with clear setup instructions
- Demo video (3–5 minutes) showing all features
- Packaged desktop app (installer or .zip)
- README with architecture overview and usage guide

---

## 13. Risks & Mitigation
| Risk | Description | Mitigation |
|------|--------------|-------------|
| FFmpeg issues | Encoding or path errors | Test early and package binaries |
| Recording permissions | OS-level capture restrictions | Prompt user and handle gracefully |
| Timeline lag | Canvas performance bottlenecks | Use requestAnimationFrame and throttling |
| Packaging failures | Cross-platform build inconsistencies | Use electron-builder with CI tests |

---

## 14. Summary
ClipForge is a full-featured desktop video editor focused on essential creative workflows. The goal is to achieve a reliable, packaged, cross-platform Electron app that supports recording, editing, and exporting efficiently.

---

**Next Steps:**
1. Initialize Electron + React app scaffold.
2. Integrate FFmpeg core for import/export.
3. Build basic timeline with draggable clips.
4. Implement screen + webcam recording.
5. Package and test final distributable.

---

**Document Version:** v1.1  
**Author:** Mitchel Valeo  
**Last Updated:** October 27, 2025


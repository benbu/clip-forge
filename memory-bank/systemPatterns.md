# System Patterns: ClipForge

## Architecture Overview

ClipForge follows a clean separation between Electron's main process, preload scripts, and renderer process to maintain security and performance.

### Process Architecture
```
┌─────────────────────────────────────────────────────┐
│ Main Process (Node.js)                              │
│ - Window management                                  │
│ - IPC handlers (file system, recording)             │
│ - FFmpeg worker orchestration                       │
│ - Native OS integrations                            │
└─────────────────┬───────────────────────────────────┘
                  │ IPC (via contextBridge)
┌─────────────────▼───────────────────────────────────┐
│ Preload Script (Secure IPC Bridge)                  │
│ - Exposes minimal, typed API to renderer            │
│ - Validates all inputs                              │
│ - Prevents direct Node.js access in renderer        │
└─────────────────┬───────────────────────────────────┘
                  │ window.electron API
┌─────────────────▼───────────────────────────────────┐
│ Renderer Process (React UI)                         │
│ - UI components (Timeline, Player, Media Library)   │
│ - State management (Zustand stores)                 │
│ - User interactions                                 │
└─────────────────────────────────────────────────────┘
```

## Project Structure Pattern

### Directory Organization
```
clip-forge/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── window-manager.js   # Window creation & lifecycle
│   │   ├── ipc-handlers.js     # IPC message handlers
│   │   └── ffmpeg-worker.js    # FFmpeg orchestration
│   ├── preload/                 # Preload scripts
│   │   └── bridge.js           # Secure IPC bridge
│   ├── renderer/                # React UI application
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Main views (Editor, Home)
│   │   ├── state/              # Zustand stores
│   │   └── lib/                # Utilities & helpers
│   ├── shared/                  # Shared types & constants
│   │   └── ipc.ts              # IPC channel definitions
│   └── recorder/                # Recording modules
│       └── capture-handler.js  # Screen/webcam capture
├── assets/                      # Icons, logos, media
├── .cursor/rules/              # AI assistant rules
└── docs/                       # Documentation
```

## Key Design Patterns

### 1. Secure IPC Communication

**Pattern**: Typed IPC channels with validation
**Location**: `src/shared/ipc.ts`, `src/main/ipc-handlers.js`, `src/preload/bridge.js`

```typescript
// Define channels in shared location
export const IPC_CHANNELS = {
  FILE_IMPORT: 'file:import',
  VIDEO_PREVIEW: 'video:preview',
  EXPORT_VIDEO: 'video:export',
  // ... more channels
};

// Handler in main process with validation
ipcMain.handle(IPC_CHANNELS.FILE_IMPORT, async (event, files) => {
  validateFiles(files);
  return await processImport(files);
});

// Expose MSP API in preload
contextBridge.exposeInMainWorld('electron', {
  importFiles: (files) => ipcRenderer.invoke(IPC_CHANNELS.FILE_IMPORT, files),
});
```

**Rationale**: Prevents security vulnerabilities while maintaining type safety and clear contracts between processes.

### 2. State Management with Zustand

**Pattern**: Separate stores for different domains
**Location**: `src/renderer/state/`

```javascript
// Timeline store
export const useTimelineStore = create((set) => ({
  clips: [],
  playhead: 0,
  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
  setPlayhead: (time) => set({ playhead: time }),
}));

// Media library store
export const useMediaStore = create((set) => ({
  files: [],
  addFile: (file) => set((state) => ({ files: [...state.files, file] })),
}));
```

**Rationale**: Lightweight, simple API, supports selective re-rendering, easy to test.

### 3. Component Composition

**Pattern**: Small, focused components composed into larger features
**Location**: `src/renderer/components/`

```
Timeline/
  ├── TimelineContainer.tsx    # Main container, manages layout
  ├── Track.tsx                # Individual track (video/audio)
  ├── Clip.tsx                 # Draggable, trimmable clip
  ├── Playhead.tsx             # Time indicator
  └── Ruler.tsx                # Time scale ruler
```

**Rationale**: Maintains single responsibility, enables reuse, simplifies testing.

### 4. FFmpeg Worker Pattern

**Pattern**: Offload heavy processing to worker process
**Location**: `src/main/ffmpeg-worker.js`

```javascript
const spawn = require('child_process').spawn;
const ffmpeg = spawn('ffmpeg', [...args]);

ffmpeg.stdout.on('data', (data) => {
  // Parse progress updates
  sendProgressToRenderer(parseProgress(data));
});

ffmpeg.on('close', (code) => {
  handleExportComplete(code);
});
```

**Rationale**: Keeps main process responsive, provides progress feedback, handles errors gracefully.

## Technical Decisions

### 1. Framework Choices

**Electron**: Desktop app framework, provides native window management and Node.js integration
**React**: Component-based UI, large ecosystem, excellent performance
**Tailwind CSS**: Utility-first styling, rapid development, consistent design system
**Zustand**: Minimal state management, simpler than Redux
**FFmpeg**: Industry-standard video processing, supports all needed operations

### 2. Security Decisions

**contextIsolation: true**: Prevents renderer from accessing Node.js directly
**sandbox: true**: Sandboxes renderer process for additional security
**nodeIntegration: false**: Blocks direct Node.js access in renderer
**Validated IPC**: All IPC messages validated before processing

### 3. Performance Decisions

**Lazy Loading**: Heavy components loaded on demand
**Throttled Updates**: Timeline updates throttled to 60 FPS
**Worker Processes**: FFmpeg runs in separate process
**Optimistic UI**: Immediate feedback, then actual processing

## Component Relationships

### Data Flow
```
Media Library → Import Files → Zustand Store → Timeline Component
                    ↓                              ↓
              FFmpeg Metadata                  Clip Components
                    ↓                              ↓
              File Thumbnails                  Drag & Drop
                    ↓                              ↓
              Store Update                    Timeline Update
                                                        ↓
                                              Export Trigger
                                                        ↓
                                              FFmpeg Processing
                                                        ↓
                                              Save to Filesystem
```

### Component Hierarchy
```
App
└── EditorLayout
    ├── MediaLibraryPanel
    │   └── FileList
    │       └── FileCard (repeat for each file)
    ├── PreviewPanel
    │   └── VideoPlayer
    │       ├── PlaybackControls
    │       └── Scrubber
    └── TimelinePanel
        └── Timeline
            ├── TimeRuler
            ├── VideoTrack (repeat for each track)
            │   └── Clip (repeat for each clip)
            └── Playhead
```

## Error Handling Pattern

**Layered Error Handling**:
1. **Component Level**: Display inline error messages for user actions
2. **State Level**: Update error state, trigger retry logic
3. **IPC Level**: Return structured error responses
4. **Process Level**: Log errors, send to monitoring (future)

```javascript
try {
  const result = await window.electron.importFiles(files);
  if (!result.success) {
    setError(result.error);
    return;
  }
  updateStore(result.data);
} catch (err) {
  setError('Unexpected error occurred');
  console.error(err);
}
```

## Testing Patterns

### Unit Testing
- Test store logic independently
- Test component rendering with mock data
- Test utility functions

### Integration Testing
- Test IPC communication flow
- Test FFmpeg processing pipeline
- Test file import/export workflows

### E2E Testing (Future)
- Use Playwright for Electron
- Test complete user workflows
- Test cross-platform compatibility


# ClipForge

Desktop video editor built with Electron, React, and Tailwind CSS.

## Current Status

✅ **MVP Complete (100%)** - Production-ready application with:
- Electron + React + Vite + Tailwind CSS v4
- Secure main process with preload bridge
- Complete 3-panel UI layout (Media Library, Player, Timeline, Settings)
- Hot Module Replacement (HMR) configured
- **31 Components** (11 base, 15 features, 5 settings pages)
- **6 Service Classes** (media, video, recording, export, persistence, fileUtils)
- **3 Zustand Stores** (media, timeline, player state management)
- **Keyboard Shortcuts** (playback, editing, file operations)
- **Tooltips & Accessibility** (ARIA labels, focus states)
- FFmpeg integration with worker thread
- Recording service (screen & webcam)
- Export system with quality presets
- State persistence with auto-save
- Timeline editor with drag/trim/split functionality
- Beautiful dark theme with smooth animations

### Media Library & Asset Management (Epic 2)
- Sortable columns: name, import date, duration, size, resolution
- Quick filters: All, Recordings, External
- Clip Detail Drawer: metadata, rename, usage by track
- Async thumbnail cache with background generation
- Missing-media detection with Relink flow (secure IPC)
- Bulk actions: multi-select, delete, add to timeline

### Performance, Observability & Reliability (Epic 5)
- Performance overlay: toggle with Ctrl+Shift+P (Cmd+Shift+P on macOS); shows FPS and JS heap usage in the bottom-right.
- Global error/crash reporter: renderer errors and unhandled rejections are logged to `userData/logs/clipforge.log`.
- FFmpeg monitoring: structured logs with scope `ffmpeg` for init/trim/merge/export/thumbnail failures.
- Memory guardrails: pre-export warnings above ~900 MB and hard stop above ~1.1 GB to avoid crashes.
 - Disk guard: checks free disk space before saving exports and aborts if insufficient.
 - Diagnostics export: one-click JSON snapshot (env, perf, state, settings) from Advanced Settings.
 - Autosave & backups: configurable autosave interval, versioned backups, crash recovery prompt on next launch.

✅ **Ready to build and distribute!** Package the app with `npm run build`

## Development

### Quick Start

```bash
# Install dependencies (if not already done)
npm install

# Start development server
npm run dev
```

This runs both the Vite dev server and Electron concurrently.

### Available Scripts

- `npm run dev` - Start Vite dev server + Electron concurrently
- `npm run dev:vite` - Start only Vite dev server
- `npm run dev:electron` - Start only Electron (waits for Vite to be ready)
- `npm run build` - Build renderer for production and package app
- `npm run build:win` - Build and package for Windows
- `npm run build:mac` - Build and package for macOS
- `npm run build:linux` - Build and package for Linux
- `npm run dist` - Same as `build` - create distributable packages
- `npm start` - Run built Electron app
- `npm run test` - Run Vitest suite
- `npm run test:e2e` - Run Playwright smoke tests (requires `npx playwright install` once)

## Continuous Integration

GitHub Actions workflow `.github/workflows/build.yml` runs unit tests, Playwright smoke tests, and platform packaging (`build:mac`, `build:win`, `build:linux`) across macOS, Windows, and Linux runners.

## Project Structure

```
clip-forge/
├── src/
│   ├── main/           # Electron main process
│   ├── preload/        # Secure IPC bridge
│   ├── renderer/       # React UI
│   │   ├── components/
│   │   │   ├── ui/     # Base UI components (to be created)
│   │   │   ├── features/ # Feature components (to be created)
│   │   │   └── layout/ # Layout components (to be created)
│   │   ├── state/      # Zustand stores (to be created)
│   │   └── styles/     # Global styles
│   ├── shared/         # Shared constants/types
│   ├── media/          # FFmpeg integration (placeholder)
│   └── recorder/       # Recording modules (placeholder)
├── public/             # Static assets
├── assets/             # Icons, logos
└── docs/               # Documentation
```

## Tech Stack

- **Electron** v38 - Desktop framework
- **React** v19 - UI library
- **Vite** v7 - Build tool & dev server
- **Tailwind CSS** v4 - Utility-first styling
- **Zustand** - State management
- **Lucide React** - Icon library

## Next Steps

See:
- `docs/clipforge_mvp_tasklist.md` for full MVP implementation plan
- `docs/clipforge_ui_setup_tasklist.md` for UI setup details
- `PROGRESS.md` for detailed progress tracking
- `docs/manual_regression_checklist.md` for QA scenarios

## Quick Test

Run the app to see the complete UI:
```bash
npm run dev
```

The app will display:
- 🎬 Media Library with 4 sample video files
- 🎮 Video Player with full control overlay
- 📊 Timeline with 2 tracks and 3 colored clips
- ⚙️ Settings panel (placeholder) on the right

## License

ISC

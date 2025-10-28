# Manual Regression Checklist

## Recording
- Start a new recording session (countdown, PiP overlay) and verify preview UI.
- Pause/resume and confirm audio meter reflects mute toggles.
- Stop recording; confirm the clip is imported with metadata and linked file path.
- Simulate missing media and relink via dialog.

## Media & Timeline
- Import external clips (picker + drag/drop) into media library.
- Toggle grid/list view and adjust zoom; ensure snapping respects configured settings.
- Trim and split clips; ensure playhead syncs with player and source offsets update.
- Overlay camera feed; reposition and persist overlay settings across restart.

## Export
- Export a short timeline; progress bar should advance beyond 10% and final file plays back.
- Cancel an export mid-run; expect warning toast and log entry.
- Verify presets (720p, 1080p, Source) produce correct resolution/bitrate.

## App Shell & Settings
- Settings defaults to Export tab; switch among categories and confirm UI updates.
- Appearance controls change theme colors; recording overlay preferences persist.
- Hotkeys (Backspace delete, split) work and focus handling remains intact.

## Packaging & Automation
- Run `npm run build` and launch packaged app; ensure timeline/recording flow works offline.
- Confirm autosave restores state after restart/crash simulation.
- Execute Playwright smoke (`npm run test:e2e`) and Vitest unit suite.

Log outcomes per run in `docs/regression_logs/<date>.md`.

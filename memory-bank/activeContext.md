# Active Context: ClipForge

## Current Focus

**Phase**: Post-MVP Feature Completion — Export & Delivery (Epic 4)
**Status**: Export queue + presets + validation shipped; preparing timeline waveform work

Focus for next work session:
1. Timeline audio waveforms and per-clip gain controls (Epic 3)
2. Timeline zoom/minimap UX improvements
3. Recording PiP & audio routing polish
4. Cross-platform QA for new export pipeline

## Recent Changes

### Completed
- Export queue with sequential scheduling, pause/cancel, and job persistence
- Real-time export telemetry (stage, ETA, FFmpeg log streaming) wired through renderer queue store
- Enhanced Export modal: social presets, bitrate/fps controls, summary review, metadata capture, diagnostics download
- Post-export validation pipeline (probe + filesystem check) with Reveal-in-Finder shortcut via secure IPC
- Media Library sortable columns and quick filters
- Clip Detail Drawer with metadata, rename, and usage by track
- Async thumbnail caching + background generation
- Missing-media detection + Relink workflow (secure IPC)
- Bulk actions: multi-select, batch delete, add to timeline
 - Performance overlay (FPS + JS heap), crash reporting, FFmpeg monitoring, export memory guardrail
 - Disk space guard before export
 - Autosave with versioned backups and crash recovery prompt
 - Diagnostics export (env/perf/state/settings)

### Git Status
- Modified: `docs/clipforge_remaining_features_tasklist.md`
- Modified: `src/main/main.js`, `src/preload/bridge.js`
- Modified: `src/media/ffmpegWorker.js`
- Modified: `src/renderer/services/exportService.js`
- Modified: `src/renderer/components/features/Export/ExportModal.jsx`
- Added: `src/renderer/store/exportQueueStore.js`

## Current Work Session

### Today's Priority
Finalize plan for timeline audio waveform rendering and schedule cross-platform QA pass for the new export queue.

### Active Decisions
1. Keep IPC surface minimal and validated; new channels (`fs:exists`, `dialog:openVideo`, `shell:revealItem`) exposed only through preload guards.
2. Prefer background workers for expensive operations (thumbnail generation, FFmpeg merges stay async with caching).
3. Export queue state lives in the renderer (Zustand store) with `exportService.enqueueExport` as the single entry point for UX.
4. Stream FFmpeg progress/logs via window events; renderer throttles display but persists last 200 log lines per job for diagnostics.

## Next Steps (Immediate)

### Immediate (Next)
1. Implement audio waveform peak generation + renderer visualization for timeline tracks.
2. Improve timeline navigation (zoom, minimap, keyboard shortcuts).
3. Execute cross-platform regression pass on the new export queue and summary UI.

### This Week
1. Ship recording PiP placement controls and audio routing presets.
2. Harden export presets (QA presets & bitrate defaults) and document recommended workflows.
3. Draft release notes + update user documentation with new export flow.

### This Sprint (2 weeks)
1. Complete waveform release (gain controls, waveform caching).
2. Finalize recording enhancements (source picker refinements, audio meter polish).
3. Profile timeline performance under heavy loads; validate virtualization approach.
4. Automate export regression smoke via Playwright.
5. Gather usability feedback on new export experience and iterate.

## Active Concerns & Questions

### Technical Concerns
1. **FFmpeg Performance**: Will WASM-based FFmpeg provide acceptable export speed?
   - **Mitigation**: Benchmark early, consider native binary fallback

2. **Timeline Performance**: Can HTML5 Canvas maintain 30+ FPS with 10+ clips?
   - **Mitigation**: Use requestAnimationFrame, optimize rendering, consider virtualization

3. **Cross-Platform File Paths**: Handling differences between Windows, macOS, and Linux
   - **Mitigation**: Use Node.js path module, test on all platforms early

### UX Concerns
1. **First-Time User Experience**: How to make the workflow intuitive?
   - **Approach**: Create guided tour or tooltips, provide sample media

2. **Export Feedback**: Long exports need clear progress indication
   - **Approach**: Real-time progress bar with time estimates

### Open Questions
1. Should we support project file saving/loading in MVP?
   - **Current**: Out of scope, but consider for future killer feature

2. What video codec should be default for exports?
   - **Current**: H.264 for maximum compatibility
   - **Alternative**: Consider VP9 or AV1 for future optimization

3. How to handle audio track management?
   - **Current**: Basic audio support on video clips
   - **Future**: Separate audio tracks, audio mixing

## Current Blockers

**None** - Project just started, no blockers identified yet.

## Learning & Knowledge Gaps

### Areas Needing Research
1. FFmpeg command syntax for complex operations (concatenation with trim)
2. HTML5 Canvas performance best practices for timeline rendering
3. Electron IPC security patterns and validation strategies
4. Cross-platform installer configuration with electron-builder

### Documentation to Review
- Electron Security Best Practices (https://www.electronjs.org/docs/tutorial/security)
- React Performance Optimization
- Tailwind CSS v4+ features and changes
- FFmpeg command-line documentation

## Workflow Notes

### Development Workflow
1. Code changes in renderer → Vite HMR updates automatically
2. Code changes in main process → Restart Electron app
3. Changes to preload → Reload window
4. Build for testing → Use electron-builder in pack mode

### Testing Workflow
1. Manual testing for UI interactions
2. Unit tests for state logic
3. Integration tests for IPC communication
4. E2E tests for complete workflows (future)

## Collaboration Notes

### Team Communication
- Project primarily solo development by Ben Burnett
- AI assistant (Cursor) for pair programming and code generation
- Documentation for future contributors or handoff

### Decision Making
- Document all major architectural decisions
- Use PRD as source of truth for feature scope
- Update Memory Bank when patterns emerge

## Environment Notes

- **OS**: Windows 10.0.26100 (user's development machine)
- **Shell**: PowerShell 7
- **Workspace**: `C:\s\gauntlet\clip-forge`
- **Node Version**: To be confirmed (18+ recommended)
- **Package Manager**: npm (can migrate to pnpm if preferred)

## Key Reminders

1. Always follow Electron security best practices
2. Keep renderer process sandboxed and isolated
3. Validate all IPC communications
4. Maintain 30+ FPS for playback and UI responsiveness
5. Test on multiple platforms before release
6. Document complex FFmpeg operations for maintenance
7. Keep UI minimal and focused on core workflow


# Active Context: ClipForge

## Current Focus

**Phase**: Post-MVP Feature Completion — Timeline & Export polish (Epics 3 + 4)
**Status**: Export queue + presets shipped; waveform extraction queue + timeline collapse refinements live

Focus for next work session:
1. Timeline zoom/minimap UX improvements + keyboard shortcuts
2. Recording PiP placement + audio routing polish
3. Cross-platform QA passes (export + waveform hydration)
4. Prep automation for export regression (Playwright harness)

## Recent Changes

### Completed
- Export queue with sequential scheduling, pause/cancel, and job persistence
- Real-time export telemetry (stage, ETA, FFmpeg log streaming) wired through renderer queue store
- Enhanced Export modal: social presets, bitrate/fps controls, summary review, metadata capture, diagnostics download
- Post-export validation pipeline (probe + filesystem check) with Reveal-in-Finder shortcut via secure IPC
- Waveform extraction queue (Electron file reads + Web Audio) with Zustand caching + timeline clip hydration/status badges
- Media Library sortable columns and quick filters
- Clip Detail Drawer with metadata, rename, and usage by track
- Async thumbnail caching + background generation
- Missing-media detection + Relink workflow (secure IPC)
- Bulk actions: multi-select, batch delete, add to timeline
 - Performance overlay (FPS + JS heap), crash reporting, FFmpeg monitoring, export memory guardrail
 - Disk space guard before export
 - Autosave with versioned backups and crash recovery prompt
 - Diagnostics export (env/perf/state/settings)
- Rich text overlay creation/editing with animated keyframes and timeline playback rendering
- Ripple editing and automatic gap collapse for clip trims/removals on unlocked tracks

### Git Status
- Modified: `docs/clipforge_remaining_features_tasklist.md`
- Modified: `src/main/main.js`, `src/preload/bridge.js`
- Modified: `src/media/ffmpegWorker.js`
- Modified: `src/renderer/services/exportService.js`
- Modified: `src/renderer/components/features/Export/ExportModal.jsx`
- Added: `src/renderer/store/exportQueueStore.js`
- Added: `src/renderer/store/waveformStore.js`, `src/renderer/services/waveformQueue.js`
- Modified: `src/renderer/services/mediaService.js`, `src/renderer/services/waveformService.js`
- Modified: `src/renderer/components/features/Timeline/Clip.jsx`, `src/renderer/store/timelineStore.js`

## Current Work Session

### Today's Priority
Stabilize waveform queue rollout; plan timeline zoom/minimap interaction design and QA matrix.

### Active Decisions
1. Keep IPC surface minimal and validated; new channels (`fs:exists`, `dialog:openVideo`, `shell:revealItem`) exposed only through preload guards.
2. Prefer background workers for expensive operations (thumbnail generation, FFmpeg merges stay async with caching).
3. Export queue state lives in the renderer (Zustand store) with `exportService.enqueueExport` as the single entry point for UX.
4. Stream FFmpeg progress/logs via window events; renderer throttles display but persists last 200 log lines per job for diagnostics.

## Next Steps (Immediate)

### Immediate (Next)
1. Improve timeline navigation (zoom wheel + minimap + keyboard shortcuts).
2. Execute cross-platform regression pass on export + waveform queue (Windows/macOS/Linux).
3. Kick off Playwright automation plan for export smoke coverage.

### This Week
1. Ship recording PiP placement controls and audio routing presets.
2. Harden waveform cache persistence (consider storing peaks alongside media metadata) and document recovery steps.
3. Draft release notes + update user documentation covering export + waveform flows.

### This Sprint (2 weeks)
1. Finalize recording enhancements (source picker refinements, audio meter polish).
2. Profile timeline performance under heavy loads; validate virtualization approach.
3. Automate export regression smoke via Playwright.
4. Gather usability feedback on new export experience + waveform UI and iterate.

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


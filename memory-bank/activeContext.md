# Active Context: ClipForge

## Current Focus

**Phase**: Post-MVP Feature Completion — Media Library & Asset Management
**Status**: Epic 2 delivered (sortable/filters, detail drawer, thumbnails, missing-media, bulk actions)

Focus for next work session:
1. Timeline & Editing upgrades (multi-tracks, overlays, waveforms, ripple edits)
2. Recording enhancements (source picker, PiP controls, audio routing)
3. Export polish (queue, presets, progress/ETA)
4. Performance, Observability & Reliability (Epic 5): overlay, logging, guardrails, autosave/backups

## Recent Changes

### Completed
- Media Library sortable columns and quick filters
- Clip Detail Drawer with metadata, rename, and usage by track
- Async thumbnail caching + background generation
- Missing-media detection + Relink workflow (secure IPC)
- Bulk actions: multi-select, batch delete, add to timeline
 - Performance overlay (FPS + JS heap), crash reporting, FFmpeg monitoring, export memory guardrail
- Rich text overlay creation/editing with animated keyframes and timeline playback rendering
- Ripple editing and automatic gap collapse for clip trims/removals on unlocked tracks

### Git Status
- Modified: `docs/clipforge_remaining_features_tasklist.md`
- Modified: `README.md`, `PROGRESS.md`
- Modified: `src/main/main.js`, `src/preload/bridge.js`
- Modified: `src/renderer/components/features/MediaLibrary/*`
- Modified: `src/renderer/services/*`, `src/renderer/store/mediaStore.js`

## Current Work Session

### Today's Priority
Document Epic 5 progress; implement autosave with versioned backups and recovery prompt.

### Active Decisions
1. Keep IPC surface minimal and validated; new channels `fs:exists` and `dialog:openVideo` restricted via preload.
2. Prefer background workers for expensive operations (thumbnail gen stays async with caching).

## Next Steps (Immediate)

### Immediate (Today)
1. ✅ Initialize Memory Bank
2. ⏳ Set up project directory structure
3. ⏳ Configure TypeScript, Vite, and Tailwind CSS
4. ⏳ Create secure preload script and IPC architecture
5. ⏳ Implement basic window manager

### This Week
1. Build base React UI with Tailwind CSS
2. Implement Media Library component
3. Set up video preview player
4. Begin timeline component structure
5. Integrate FFmpeg for basic operations

### This Sprint (2 weeks)
1. Complete timeline drag-and-drop functionality
2. Implement trimming and splitting
3. Build screen recording capability
4. Create export workflow
5. Package initial build for testing

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


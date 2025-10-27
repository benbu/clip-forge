# Active Context: ClipForge

## Current Focus

**Phase**: Project Initialization & Foundation Setup
**Status**: Early Setup - Basic Electron scaffold complete, awaiting full architecture implementation

The project is at the very beginning stages with only a basic Electron "Hello World" setup. The next critical steps involve:
1. Establishing the full project structure
2. Setting up React and Tailwind CSS
3. Creating the secure IPC architecture
4. Beginning UI component development

## Recent Changes

### Completed
- Created basic Electron application with `src/main/main.js`
- Set up package.json with Electron dependency
- Created comprehensive documentation (PRD and Task List)
- Established `.cursor/rules/` directory with development guidelines

### Git Status
- Modified: `docs/clipforge_mvp_tasklist.md`
- Modified: `src/main/main.js`
- Untracked: `.cursor/` directory with project rules

## Current Work Session

### Today's Priority
Initializing the Memory Bank and documenting the project's architecture and current state for future reference.

### Active Decisions

#### 1. Build Tool Selection
**Decision Needed**: Choose primary bundler for renderer process
- **Options**: Vite, esbuild, webpack
- **Consideration**: Vite offers excellent HMR and React integration
- **Recommendation**: Vite for development speed and modern tooling

#### 2. State Management Choice
**Decision**: Use Zustand
- **Rationale**: Simple API, minimal boilerplate, fits project scope
- **Alternative Considered**: Redux (too heavy for this MVP)

#### 3. TypeScript Integration
**Decision Pending**: When to introduce TypeScript
- **Options**: From start vs. gradual migration
- **Recommendation**: Start with TypeScript from beginning for better DX
- **Trade-off**: Slightly slower initial setup vs. long-term maintainability

#### 4. FFmpeg Strategy
**Decision Needed**: Package selection for FFmpeg
- **Options**: 
  - `@ffmpeg/ffmpeg` (WASM, web-based, easier bundling)
  - Native FFmpeg binaries (faster, requires platform-specific bundling)
- **Consideration**: Performance vs. ease of deployment
- **Recommendation**: Start with `@ffmpeg/ffmpeg`, evaluate performance later

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


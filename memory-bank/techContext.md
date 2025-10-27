# Technical Context: ClipForge

## Technology Stack

### Core Framework
- **Electron** (`^38.4.0`): Desktop application framework
  - Main process for window management and native integrations
  - Renderer process for UI rendering
  - IPC for secure inter-process communication

### UI Framework
- **React** (to be installed): Component-based UI library
  - Functional components with hooks
  - JSX for declarative UI
  - Virtual DOM for efficient rendering

### Styling
- **Tailwind CSS** (to be installed): Utility-first CSS framework
  - PostCSS with autoprefixer
  - Dark mode support
  - Responsive design utilities
  - Custom design tokens for consistency

### State Management
- **Zustand** (to be installed): Lightweight state management
  - Simple API for stores
  - Minimal boilerplate
  - Selective re-rendering support

### Video Processing
- **FFmpeg** (to be integrated): Industry-standard video processing
  - Video trimming and concatenation
  - Encoding and transcoding
  - Format conversion
  - Metadata extraction

### Development Tools
- **TypeScript** (to be integrated): Type safety for JavaScript
  - Strict mode enabled
  - Type definitions for Electron and React
  - Better IDE support and error detection

- **Vite** (to be configured): Build tool for renderer
  - Fast HMR (Hot Module Replacement)
  - Optimized production builds
  - Plugin ecosystem for React

- **esbuild/tsup** (optional): Alternative build tool
  - Faster builds for preload scripts
  - Can handle TypeScript compilation

## Current Setup Status

### Installed
- Electron (^38.4.0)
- Basic project structure with `src/main/main.js`

### To Be Installed
- React and React DOM
- Tailwind CSS with PostCSS
- Zustand
- Vite or alternative bundler
- TypeScript and related tooling
- FFmpeg binaries or wrapper library
- Testing framework (Vitest)
- Linting tools (ESLint)

## Development Setup

### Package Management
- **Current**: npm (based on `package-lock.json`)
- **Preferred**: pnpm (can be migrated)
- **Scripts** (to be configured):
  ```json
  {
    "dev": "concurrently run electron + vite",
    "build:renderer": "vite build",
    "build:preload": "tsup or esbuild",
    "build:main": "ts-node or tsx",
    "build": "build all",
    "pack": "electron-builder --dir",
    "dist": "electron-builder",
    "test": "vitest",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
  ```

### Configuration Files Required

#### `.editorconfig`
Standardize code formatting across team
```ini
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
```

#### `.prettierrc`
Code formatter configuration
```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

#### `tailwind.config.ts`
Tailwind CSS configuration
```typescript
export default {
  content: ['./index.html', './src/renderer/**/*.{ts,tsx,html}'],
  theme: { extend: {} },
  plugins: [],
};
```

#### `postcss.config.cjs`
PostCSS with Tailwind and Autoprefixer
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

#### `electron-builder.yml` or `package.json` build config
Packaging configuration
```yaml
appId: com.clipforge.editor
productName: ClipForge
files:
  - dist/**/*
  - package.json
mac:
  target: [dmg]
win:
  target: [nsis]
linux:
  target: [AppImage]
```

## Development Environment

### System Requirements
- **Node.js**: Version 18+ recommended
- **Operating System**: Windows, macOS, or Linux
- **FFmpeg**: System installation or bundled binary
- **Disk Space**: ~500MB for development, ~200MB for packaged app

### IDE Setup
- VS Code recommended (or Cursor)
- Recommended extensions:
  - ESLint
  - Prettier
  - Tailwind CSS IntelliSense
  - TypeScript and JavaScript Language Features

### Hot Reload Setup
- Vite for renderer process (instant updates)
- nodemon or similar for main process
- Preload script rebuild on changes

## Security Considerations

### Electron Security
- **contextIsolation**: Always enabled
- **sandbox**: Enabled for renderer
- **nodeIntegration**: Disabled in renderer
- **enableRemoteModule**: Disabled

### Content Security Policy
Renderer should use CSP header:
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
```

### Input Validation
- All IPC messages validated in main process
- File paths sanitized before filesystem access
- URLs validated before opening externally

## Dependencies

### Production Dependencies
```json
{
  "electron": "^38.4.0",
  "react": "^18.x",
  "react backbone": "^18.x",
  "zustand": "^4.x",
  "@ffmpeg/ffmpeg": "^0.12.x",
  "@ffmpeg/core": "^0.12.x"
}
```

### Development Dependencies
```json
{
  "vite": "^5.x",
  "@vitejs/plugin-react": "^4.x",
  "tailwindcss": "^4.x",
  "postcss": "^8.x",
  "autoprefixer": "^10.x",
  "typescript": "^5.x",
  "@types/react": "^18.x",
  "@types/node": "^20.x",
  "vitest": "^1.x",
  "eslint": "^8.x",
  "@typescript-eslint/parser": "^6.x",
  "@typescript-eslint/eslint-plugin": "^6.x",
  "electron-builder": "^24.x"
}
```

## Build & Packaging

### Build Targets
- **Windows**: NSIS installer or portable .exe
- **macOS**: DMG with code signing (optional)
- **Linux**: AppImage or .deb package

### FFmpeg Bundling
FFmpeg binaries must be bundled with the application:
- Option 1: Use `@ffmpeg/ffmpeg` which bundles WASM version
- Option 2: Bundle native FFmpeg binaries per platform
- Include appropriate licenses for distribution

### Code Signing
For production releases:
- Windows: EV code signing certificate
- macOS: Apple Developer certificate
- Linux: Not required, but GPG signing for repositories

## Performance Targets

- **App Launch**: < 5 seconds from executable to UI
- **Playback**: 30+ FPS smooth video playback
- **Timeline Response**: Handles 10+ clips without lag
- **Export Speed**: 2-minute clip in < 30 seconds
- **Memory Usage**: < 1GB during typical editing session
- **CPU Usage**: Efficient use, avoid main thread blocking

## Platform-Specific Considerations

### Windows
- Path handling for file system access
- Process management for FFmpeg workers
- Windows notifications support
- Auto-updater integration

### macOS
- Menu bar integration
- Dock behavior and customizations
- Gatekeeper compatibility
- Universal binary (Intel + Apple Silicon)

### Linux
- Desktop file for launcher integration
- AppImage or snap packaging
- File association support
- Tray icon support

## Testing Infrastructure

### Unit Testing
- **Framework**: Vitest
- **Location**: `__tests__` or `*.test.{js,ts,jsx,tsx}`
- **Coverage**: Aim for 70%+ coverage

### Integration Testing
- **Framework**: Vitest with test environment
- **Focus**: IPC communication, file operations

### E2E Testing
- **Framework**: Playwright (with Electron support)
- **Focus**: Complete user workflows
- **Coverage**: Critical paths (import, edit, export)

### CI/CD
- GitHub Actions or similar
- Automated testing on push
- Build artifacts per platform
- Release workflow with electron-builder

## Logging & Debugging

### Main Process
- Use `electron-log` for structured logging
- Write to app data directory
- Rotate logs to prevent disk bloat

### Renderer Process
- Console logging in development
- Production: optional Sentry integration
- Avoid logging PII (personally identifiable information)

### FFmpeg
- Capture FFmpeg stderr/stdout for debugging
- Parse progress from FFmpeg output
- Display errors in user-friendly format

## Deployment

### Release Strategy
1. Development builds → local testing
2. Pre-release → internal testing
3. Beta → limited user testing
4. Production → public release

### Version Management
- Semantic versioning (SemVer)
- Changelog with each release
- Auto-updater (electron-updater) for future releases

### Distribution
- GitHub Releases for open source
- Direct download from website
- Auto-updater for seamless updates


# Repository Guidelines

## Project Structure & Module Organization
- `src/main` contains the Electron entry point (`main.js`) and window lifecycle logic; keep preload paths and security flags in sync when adding new windows.
- `src/preload/bridge.js` is the only IPC surface exposed to the renderer—extend it cautiously and document each method.
- `src/renderer` hosts the React app: colocate UI in `components/features`, shared UI primitives in `components/ui`, state in `store`, and service helpers in `services`. Keep FFmpeg helpers in `src/media` and shared constants in `src/shared`.
- Use `public/` for assets bundled by Vite and `assets/` for installer icons referenced by Electron Builder. Planning notes live in `docs/`.

## Build, Test, and Development Commands
- `npm install` installs dependencies; rerun when `package.json` changes.
- `npm run dev` starts Vite and Electron together for live reloading. Use `npm run dev:vite` or `npm run dev:electron` when debugging either side independently.
- `npm run build` produces the production renderer build and packages the desktop app. Platform-specific variants (`build:win|mac|linux`) target installers under `dist-packages/`.
- `npm start` launches the last built desktop bundle.

## Coding Style & Naming Conventions
- Follow the existing 2-space indentation, semicolons, and single quotes across JS/JSX files. Prefer function components with PascalCase file names (e.g., `ResizablePanel.jsx`).
- Style UI with Tailwind utility classes; keep long class strings readable by grouping layout → color → interaction utilities.

## Testing Guidelines
- Automated tests are not yet configured; if you add Vitest + React Testing Library, place specs alongside components as `*.test.jsx` and update the `npm test` script.
- For now, document manual verification in PRs: run `npm run dev`, exercise timeline editing, media import, recording, and export flows on your platform.
- Gate FFmpeg-dependent features so tests can mock them safely.

## Commit & Pull Request Guidelines
- Follow the repo’s short, present-tense commit style (`timeline refinements`, `project setup`). Use additional body text for rationale or follow-ups.
- Reference issues with `Refs #ID` when applicable and squash fixups locally before opening a PR.
- PRs should include: purpose summary, screenshots or screen recordings of UI changes, manual test notes, and call out any Electron security-sensitive updates (preload, IPC, file writes).

## Security & Configuration Tips
- Maintain `contextIsolation`, `sandbox`, and `nodeIntegration: false` when customizing windows. Any new IPC channel must validate inputs and reject untrusted paths.

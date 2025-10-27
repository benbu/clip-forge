# ClipForge

Desktop video editor built with Electron, React, and Tailwind CSS.

## Current Status

✅ **Setup Complete**: Project foundation is established with:
- Electron + React + Vite + Tailwind CSS v4
- Secure main process with preload bridge
- Basic 3-panel UI layout (Media Library, Player, Timeline, Settings)
- Hot Module Replacement (HMR) configured

🔄 **In Progress**: Design system and UI components

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
- `npm run build` - Build renderer for production
- `npm start` - Run built Electron app

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

See `docs/clipforge_mvp_tasklist.md` for complete implementation plan.

## License

ISC


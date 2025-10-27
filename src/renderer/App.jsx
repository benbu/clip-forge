import React from 'react';
import { MediaLibrary } from './components/features/MediaLibrary/MediaLibrary';
import { VideoPlayer } from './components/features/Player/VideoPlayer';
import { Timeline } from './components/features/Timeline/Timeline';
import { SettingsPanel } from './components/features/Settings/SettingsPanel';
import { ResizablePanel } from './components/ui/ResizablePanel';

export default function App() {
  return (
    <div className="h-screen flex flex-col">
      {/* Top Bar */}
      <header className="h-12 border-b border-white/10 bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/50 flex items-center px-3 select-none flex-shrink-0">
        <div className="font-semibold tracking-wide">ClipForge</div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <button className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition">Import</button>
          <button className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition">Record</button>
          <button className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 transition">Export</button>
        </div>
      </header>

      {/* Main 3-panel layout */}
      <main className="flex gap-2 p-2 flex-1 min-h-0">
        {/* Left: Media Library */}
        <ResizablePanel
          id="media-library"
          side="left"
          defaultSize={280}
          minSize={200}
          maxSize={600}
        >
          <MediaLibrary />
        </ResizablePanel>

        {/* Center: Player (flexible) */}
        <div className="flex-1 min-w-0">
          <VideoPlayer />
        </div>

        {/* Right: Settings */}
        <ResizablePanel
          id="settings"
          side="right"
          defaultSize={320}
          minSize={200}
          maxSize={600}
        >
          <aside className="h-full rounded-lg border border-white/10 bg-zinc-900/40 p-2">
            <SettingsPanel />
          </aside>
        </ResizablePanel>
      </main>

      {/* Bottom: Timeline (resizable) */}
      <ResizablePanel
        id="timeline"
        side="top"
        defaultSize={256}
        minSize={150}
        maxSize={600}
        className="w-full"
      >
        <footer className="h-full w-full border-t border-white/10 bg-zinc-900/60 p-2">
          <Timeline />
        </footer>
      </ResizablePanel>
    </div>
  );
}

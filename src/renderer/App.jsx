import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen grid grid-rows-[auto_1fr_auto]">
      {/* Top Bar */}
      <header className="h-12 border-b border-white/10 bg-zinc-900/60 backdrop-blur supports-[backdrop-filter]:bg-zinc-900/50 flex items-center px-3 select-none">
        <div className="font-semibold tracking-wide">ClipForge</div>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <button className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition">Import</button>
          <button className="px-3 py-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition">Record</button>
          <button className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 transition">Export</button>
        </div>
      </header>

      {/* Main 3-panel layout */}
      <main className="grid grid-cols-[280px_1fr_320px] gap-2 p-2">
        {/* Left: Media Library */}
        <section className="rounded-lg border border-white/10 bg-zinc-900/40 p-2">
          <div className="text-xs uppercase text-zinc-400 mb-2">Media Library</div>
          <div className="space-y-2">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-20 rounded-md bg-zinc-800/70 border border-white/5" />
            ))}
          </div>
        </section>

        {/* Center: Player */}
        <section className="rounded-lg border border-white/10 bg-zinc-900/40 p-2 flex items-center justify-center">
          <div className="aspect-video w-full max-w-4xl rounded-lg bg-zinc-800/70 border border-white/5 grid place-items-center">
            <span className="text-zinc-400 text-sm">Player Placeholder</span>
          </div>
        </section>

        {/* Right: Settings */}
        <aside className="rounded-lg border border-white/10 bg-zinc-900/40 p-2">
          <div className="text-xs uppercase text-zinc-400 mb-2">Settings</div>
          <div className="space-y-3 text-sm">
            <div>
              <div className="mb-1 text-zinc-300">Primary Color</div>
              <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1">
                <option>Indigo</option>
                <option>Blue</option>
                <option>Violet</option>
                <option>Emerald</option>
              </select>
            </div>
            <div>
              <div className="mb-1 text-zinc-300">Border Radius</div>
              <input type="range" min="0" max="24" className="w-full" />
            </div>
            <div>
              <div className="mb-1 text-zinc-300">Shadow Intensity</div>
              <input type="range" min="0" max="5" className="w-full" />
            </div>
          </div>
        </aside>
      </main>

      {/* Bottom: Timeline */}
      <footer className="h-40 border-t border-white/10 bg-zinc-900/60 p-2">
        <div className="text-xs uppercase text-zinc-400 mb-2">Timeline</div>
        <div className="grid grid-cols-12 gap-2 h-[calc(100%-1rem)]">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="rounded-md bg-zinc-800/70 border border-white/5" />
          ))}
        </div>
      </footer>
    </div>
  );
}

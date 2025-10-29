import React, { useState } from 'react';
import { Slider } from '../../ui/Slider';
import { Switch } from '../../ui/Switch';
import { Edit3 } from 'lucide-react';

export function EditorSettings() {
  const [zoom, setZoom] = useState(1);
  const [trackHeight, setTrackHeight] = useState(24);
  const [autohideDelay, setAutohideDelay] = useState(3);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Edit3 className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-zinc-100">Editor</h3>
      </header>

      <section className="space-y-2 first:border-none first:pt-0 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Timeline</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Default Zoom: {zoom}x</label>
            <Slider
              value={[zoom]}
              min={0.5}
              max={2}
              step={0.1}
              onValueChange={([val]) => setZoom(val)}
              size="sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Track Height: {trackHeight}px</label>
            <Slider
              value={[trackHeight]}
              min={20}
              max={48}
              step={2}
              onValueChange={([val]) => setTrackHeight(val)}
              size="sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Snap to Grid</span>
            <Switch checked={true} onChange={() => {}} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Show Grid Lines</span>
            <Switch checked={false} onChange={() => {}} size="sm" />
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Player</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Auto-play on Import</span>
            <Switch checked={false} onChange={() => {}} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Loop Playback</span>
            <Switch checked={false} onChange={() => {}} size="sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Control Auto-hide Delay: {autohideDelay}s</label>
            <Slider
              value={[autohideDelay]}
              min={1}
              max={10}
              step={1}
              onValueChange={([val]) => setAutohideDelay(val)}
              size="sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Performance</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Hardware Acceleration</span>
            <Switch checked={true} onChange={() => {}} size="sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Thumbnail Quality</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  );
}


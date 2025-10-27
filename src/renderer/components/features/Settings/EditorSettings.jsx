import React, { useState } from 'react';
import { Slider } from '../../ui/Slider';
import { Switch } from '../../ui/Switch';
import { Edit3, Timer, Play, Zap } from 'lucide-react';

export function EditorSettings() {
  const [zoom, setZoom] = useState(1);
  const [trackHeight, setTrackHeight] = useState(24);
  const [autohideDelay, setAutohideDelay] = useState(3);

  return (
    <div className="space-y-4">
      {/* Timeline Settings */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">Timeline</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Default Zoom: {zoom}x</label>
            <Slider value={[zoom]} min={0.5} max={2} step={0.1} onValueChange={([val]) => setZoom(val)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Track Height: {trackHeight}px</label>
            <Slider value={[trackHeight]} min={20} max={48} step={2} onValueChange={([val]) => setTrackHeight(val)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Snap to Grid</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Show Grid Lines</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* Player Settings */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">Player</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Auto-play on Import</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Loop Playback</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Control Auto-hide Delay: {autohideDelay}s</label>
            <Slider value={[autohideDelay]} min={1} max={10} step={1} onValueChange={([val]) => setAutohideDelay(val)} />
          </div>
        </div>
      </div>

      {/* Performance */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">Performance</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Hardware Acceleration</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Thumbnail Quality</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}


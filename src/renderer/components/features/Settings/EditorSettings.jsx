import React, { useState } from 'react';
import { Slider } from '../../ui/Slider';
import { Switch } from '../../ui/Switch';
import { Edit3, Timer, Play, Zap } from 'lucide-react';

export function EditorSettings() {
  const [zoom, setZoom] = useState(1);
  const [trackHeight, setTrackHeight] = useState(24);
  const [autohideDelay, setAutohideDelay] = useState(3);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
        <Edit3 className="h-5 w-5 text-indigo-400" />
        Editor Settings
      </h3>

      {/* Timeline Settings */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Timer className="h-4 w-4" />
          Timeline
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Default Zoom: {zoom}x</label>
            <Slider value={[zoom]} min={0.5} max={2} step={0.1} onValueChange={([val]) => setZoom(val)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Track Height: {trackHeight}px</label>
            <Slider value={[trackHeight]} min={20} max={48} step={2} onValueChange={([val]) => setTrackHeight(val)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Snap to Grid</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Show Grid Lines</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* Player Settings */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Play className="h-4 w-4" />
          Player
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Auto-play on Import</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Loop Playback</span>
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
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Performance
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Hardware Acceleration</span>
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


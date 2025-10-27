import React, { useState } from 'react';
import { Switch } from '../../ui/Switch';
import { Slider } from '../../ui/Slider';
import { Code, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/Button';

export function AdvancedSettings() {
  const [autosave, setAutosave] = useState(5);
  const [maxUndo, setMaxUndo] = useState(50);
  const [maxCacheSize, setMaxCacheSize] = useState(5);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
        <Code className="h-5 w-5 text-indigo-400" />
        Advanced Settings
      </h3>

      {/* App Behavior */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Code className="h-4 w-4" />
          App Behavior
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Auto-save Interval: {autosave} minutes</label>
            <Slider value={[autosave]} min={1} max={60} step={1} onValueChange={([val]) => setAutosave(val)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Max Undo History: {maxUndo}</label>
            <Slider value={[maxUndo]} min={5} max={100} step={5} onValueChange={([val]) => setMaxUndo(val)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Enable Analytics</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Crash Reporting</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* Storage */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <HardDrive className="h-4 w-4" />
          Storage
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Max Cache Size: {maxCacheSize} GB</label>
            <Slider value={[maxCacheSize]} min={1} max={50} step={1} onValueChange={([val]) => setMaxCacheSize(val)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="flex-1">
              Clear Cache
            </Button>
            <Button variant="ghost">
              Browse...
            </Button>
          </div>
        </div>
      </div>

      {/* Updates */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Updates
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Auto-update</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Update Channel</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Stable</option>
              <option>Beta</option>
            </select>
          </div>
          <Button variant="secondary" className="w-full">
            Check for Updates
          </Button>
        </div>
      </div>
    </div>
  );
}


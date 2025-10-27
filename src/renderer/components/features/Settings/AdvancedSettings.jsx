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
    <div className="space-y-4">
      {/* App Behavior */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">App Behavior</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Auto-save Interval: {autosave} minutes</label>
            <Slider value={[autosave]} min={1} max={60} step={1} onValueChange={([val]) => setAutosave(val)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Max Undo History: {maxUndo}</label>
            <Slider value={[maxUndo]} min={5} max={100} step={5} onValueChange={([val]) => setMaxUndo(val)} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Enable Analytics</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Crash Reporting</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
        </div>
      </div>

      {/* Storage */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">Storage</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Max Cache Size: {maxCacheSize} GB</label>
            <Slider value={[maxCacheSize]} min={1} max={50} step={1} onValueChange={([val]) => setMaxCacheSize(val)} />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" className="flex-1" size="sm">
              Clear Cache
            </Button>
            <Button variant="ghost" size="sm">
              Browse...
            </Button>
          </div>
        </div>
      </div>

      {/* Updates */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">Updates</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Auto-update</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Update Channel</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Stable</option>
              <option>Beta</option>
            </select>
          </div>
          <Button variant="secondary" className="w-full" size="sm">
            Check for Updates
          </Button>
        </div>
      </div>
    </div>
  );
}

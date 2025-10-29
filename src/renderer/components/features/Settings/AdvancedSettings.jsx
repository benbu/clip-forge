import React, { useState } from 'react';
import { Switch } from '../../ui/Switch';
import { Slider } from '../../ui/Slider';
import { Code } from 'lucide-react';
import { Button } from '../../ui/Button';

export function AdvancedSettings() {
  const [autosave, setAutosave] = useState(5);
  const [maxUndo, setMaxUndo] = useState(50);
  const [maxCacheSize, setMaxCacheSize] = useState(5);

  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Code className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-zinc-100">Advanced</h3>
      </header>

      <section className="space-y-2 first:border-none first:pt-0 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">App Behavior</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Auto-save Interval: {autosave} minutes</label>
            <Slider
              value={[autosave]}
              min={1}
              max={60}
              step={1}
              onValueChange={([val]) => setAutosave(val)}
              size="sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Max Undo History: {maxUndo}</label>
            <Slider
              value={[maxUndo]}
              min={5}
              max={100}
              step={5}
              onValueChange={([val]) => setMaxUndo(val)}
              size="sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center justify-between border border-white/10 rounded px-2 py-1">
              <span className="text-xs text-zinc-300">Enable Analytics</span>
              <Switch checked={false} onChange={() => {}} size="sm" />
            </div>
            <div className="flex items-center justify-between border border-white/10 rounded px-2 py-1">
              <span className="text-xs text-zinc-300">Crash Reporting</span>
              <Switch checked={true} onChange={() => {}} size="sm" />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Storage</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Max Cache Size: {maxCacheSize} GB</label>
            <Slider
              value={[maxCacheSize]}
              min={1}
              max={50}
              step={1}
              onValueChange={([val]) => setMaxCacheSize(val)}
              size="sm"
            />
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
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Updates</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Auto-update</span>
            <Switch checked={true} onChange={() => {}} size="sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Update Channel</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
              <option>Stable</option>
              <option>Beta</option>
            </select>
          </div>
          <Button variant="secondary" className="w-full" size="sm">
            Check for Updates
          </Button>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Settings Management</h4>
        <div className="flex items-center gap-1">
          <Button variant="secondary" className="flex-1" size="sm">
            Reset to Defaults
          </Button>
          <Button variant="ghost" className="flex-1" size="sm">
            Export Settings
          </Button>
          <Button variant="ghost" className="flex-1" size="sm">
            Import Settings
          </Button>
        </div>
      </section>
    </div>
  );
}

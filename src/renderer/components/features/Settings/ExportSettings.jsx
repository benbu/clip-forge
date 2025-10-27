import React from 'react';
import { Switch } from '../../ui/Switch';
import { Download, Zap, Settings } from 'lucide-react';

export function ExportSettings() {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
        <Download className="h-5 w-5 text-indigo-400" />
        Export Settings
      </h3>

      {/* Export Quality */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Download className="h-4 w-4" />
          Default Quality
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Resolution</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Original</option>
              <option>1080p (1920×1080)</option>
              <option>720p (1280×720)</option>
              <option>480p (854×480)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Frame Rate</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Original</option>
              <option>60 FPS</option>
              <option>30 FPS</option>
              <option>24 FPS</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Output Format</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>MP4</option>
              <option>MOV</option>
              <option>WebM</option>
              <option>AVI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Export */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" />
          Advanced
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Two-Pass Encoding</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Hardware Acceleration</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Encoding Preset</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Fast</option>
              <option>Balanced</option>
              <option>High Quality</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}


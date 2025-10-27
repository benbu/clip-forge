import React, { useState } from 'react';
import { Switch } from '../../ui/Switch';
import { Video, Monitor } from 'lucide-react';

export function RecordingSettings() {
  return (
    <div className="space-y-4">
      {/* Recording Quality */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">Default Quality</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Resolution</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>720p (1280×720)</option>
              <option>1080p (1920×1080)</option>
              <option>1440p (2560×1440)</option>
              <option>4K (3840×2160)</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Frame Rate</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>24 FPS</option>
              <option>30 FPS</option>
              <option>60 FPS</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Codec</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>H.264</option>
              <option>H.265</option>
              <option>VP9</option>
            </select>
          </div>
        </div>
      </div>

      {/* Source Settings */}
      <div>
        <h4 className="text-xs font-medium text-zinc-300 mb-2">Source Settings</h4>
        <div className="space-y-2 bg-zinc-900/50 rounded-lg p-3">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Video Input</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Screen 1 (Primary)</option>
              <option>Screen 2</option>
              <option>Webcam</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Audio Input</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Microphone (Default)</option>
              <option>System Audio</option>
              <option>Both</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Preview Recording Overlay</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}

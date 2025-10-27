import React, { useState } from 'react';
import { Slider } from '../../ui/Slider';
import { Switch } from '../../ui/Switch';
import { Input } from '../../ui/Input';
import { Palette, Type, Layout, Eye, Film, Sparkles } from 'lucide-react';

export function AppearanceSettings() {
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [backgroundColor, setBackgroundColor] = useState('#18181b');
  const [borderRadius, setBorderRadius] = useState(8);
  const [shadowIntensity, setShadowIntensity] = useState(3);
  const [fontSize, setFontSize] = useState(14);
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
        <Palette className="h-5 w-5 text-indigo-400" />
        Appearance Settings
      </h3>

      {/* Theme Colors */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Theme Colors
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Primary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-12 h-8 rounded cursor-pointer"
                />
                <Input value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Secondary Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-12 h-8 rounded cursor-pointer"
                />
                <Input value={secondaryColor} onChange={(e) => setSecondaryColor(e.target.value)} className="flex-1" />
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Background Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
                className="w-12 h-8 rounded cursor-pointer"
              />
              <Input value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} className="flex-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Typography */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Type className="h-4 w-4" />
          Typography
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Base Font Size: {fontSize}px</label>
            <Slider value={[fontSize]} min={12} max={18} step={1} onValueChange={([val]) => setFontSize(val)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Font Family</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Inter (Default)</option>
              <option>System Sans</option>
              <option>Roboto</option>
              <option>Open Sans</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Font Weight</label>
            <select className="w-full bg-zinc-800 border border-white/10 rounded px-3 py-2 text-sm">
              <option>Regular</option>
              <option>Medium</option>
              <option>Semi-Bold</option>
              <option>Bold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Spacing & Layout */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Layout className="h-4 w-4" />
          Spacing & Layout
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Border Radius: {borderRadius}px</label>
            <Slider value={[borderRadius]} min={0} max={24} step={1} onValueChange={([val]) => setBorderRadius(val)} />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-2 block">Shadow Intensity: {shadowIntensity}/5</label>
            <Slider value={[shadowIntensity]} min={0} max={5} step={1} onValueChange={([val]) => setShadowIntensity(val)} />
          </div>
        </div>
      </div>

      {/* Visual Effects */}
      <div>
        <h4 className="text-sm font-medium text-zinc-300 mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Visual Effects
        </h4>
        <div className="space-y-3 bg-zinc-900/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Glassmorphism Effect</span>
            <Switch checked={false} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Panel Borders</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-300">Animations</span>
            <Switch checked={true} onChange={() => {}} />
          </div>
        </div>
      </div>
    </div>
  );
}


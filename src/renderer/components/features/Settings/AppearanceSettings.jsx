import React, { useState } from 'react';
import { Slider } from '../../ui/Slider';
import { Switch } from '../../ui/Switch';
import { Input } from '../../ui/Input';
import { Palette } from 'lucide-react';

export function AppearanceSettings() {
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [secondaryColor, setSecondaryColor] = useState('#8b5cf6');
  const [backgroundColor, setBackgroundColor] = useState('#18181b');
  const [borderRadius, setBorderRadius] = useState(8);
  const [shadowIntensity, setShadowIntensity] = useState(3);
  const [fontSize, setFontSize] = useState(14);
  
  return (
    <div className="space-y-3">
      <header className="flex items-center gap-2 border-b border-white/10 pb-2">
        <Palette className="h-4 w-4 text-indigo-400" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-zinc-100">Appearance</h3>
      </header>

      <section className="space-y-2 first:border-none first:pt-0 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Theme Colors</h4>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="w-6 h-4 rounded cursor-pointer"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="flex-1"
                size="sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Secondary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="w-6 h-4 rounded cursor-pointer"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="flex-1"
                size="sm"
              />
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
              className="w-6 h-4 rounded cursor-pointer"
            />
            <Input
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="flex-1"
              size="sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Typography</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Base Font Size: {fontSize}px</label>
            <Slider
              value={[fontSize]}
              min={12}
              max={18}
              step={1}
              onValueChange={([val]) => setFontSize(val)}
              size="sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Font Family</label>
              <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
                <option>Inter (Default)</option>
                <option>System Sans</option>
                <option>Roboto</option>
                <option>Open Sans</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Font Weight</label>
              <select className="w-full bg-zinc-800 border border-white/10 rounded px-2 py-1 text-[11px]">
                <option>Regular</option>
                <option>Medium</option>
                <option>Semi-Bold</option>
                <option>Bold</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Spacing & Layout</h4>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Border Radius: {borderRadius}px</label>
            <Slider
              value={[borderRadius]}
              min={0}
              max={24}
              step={1}
              onValueChange={([val]) => setBorderRadius(val)}
              size="sm"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-400 mb-1 block">Shadow Intensity: {shadowIntensity}/5</label>
            <Slider
              value={[shadowIntensity]}
              min={0}
              max={5}
              step={1}
              onValueChange={([val]) => setShadowIntensity(val)}
              size="sm"
            />
          </div>
        </div>
      </section>

      <section className="space-y-2 border-t border-white/5 pt-2">
        <h4 className="text-xs font-medium text-zinc-300">Visual Effects</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Glassmorphism Effect</span>
            <Switch checked={false} onChange={() => {}} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Panel Borders</span>
            <Switch checked={true} onChange={() => {}} size="sm" />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-300">Animations</span>
            <Switch checked={true} onChange={() => {}} size="sm" />
          </div>
        </div>
      </section>
    </div>
  );
}


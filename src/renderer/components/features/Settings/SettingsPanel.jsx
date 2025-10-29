import React, { useState } from 'react';
import { Palette, Edit3, Video, Download, Code } from 'lucide-react';
import { Card } from '../../ui/Card';
import { AppearanceSettings } from './AppearanceSettings';
import { EditorSettings } from './EditorSettings';
import { RecordingSettings } from './RecordingSettings';
import { ExportSettings } from './ExportSettings';
import { AdvancedSettings } from './AdvancedSettings';
import { cn } from '@/lib/utils';

const SETTINGS_CATEGORIES = [
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'editor', name: 'Editor', icon: Edit3 },
  { id: 'recording', name: 'Recording', icon: Video },
  { id: 'export', name: 'Export', icon: Download },
  { id: 'advanced', name: 'Advanced', icon: Code },
];

export function SettingsPanel() {
  const [activeCategory, setActiveCategory] = useState('export');

  const renderSettingsContent = () => {
    switch (activeCategory) {
      case 'appearance':
        return <AppearanceSettings />;
      case 'editor':
        return <EditorSettings />;
      case 'recording':
        return <RecordingSettings />;
      case 'export':
        return <ExportSettings />;
      case 'advanced':
        return <AdvancedSettings />;
      default:
        return <ExportSettings />;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Horizontal Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex gap-0.5 -mb-px overflow-x-auto px-1 py-1">
          {SETTINGS_CATEGORIES.map((category) => {
            const Icon = category.icon;
            const isActive = activeCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={cn(
                  'flex items-center justify-center rounded-md px-1.5 py-1 border-b-2 transition-colors',
                  isActive
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                )}
                aria-label={category.name}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings Content Area - Full Width */}
      <div className="flex-1 overflow-y-auto py-2 pr-1">
        {renderSettingsContent()}
      </div>
    </Card>
  );
}

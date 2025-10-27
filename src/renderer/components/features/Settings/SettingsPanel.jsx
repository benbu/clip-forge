import React, { useState } from 'react';
import { Settings, Palette, Edit3, Video, Download, Code } from 'lucide-react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
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
  const [activeCategory, setActiveCategory] = useState('appearance');

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
        return <AppearanceSettings />;
    }
  };

  return (
    <Card className="flex flex-col h-full">
      {/* Settings Header */}
      <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10">
        <Settings className="h-5 w-5 text-indigo-400" />
        <h2 className="text-lg font-semibold text-zinc-100">Settings</h2>
      </div>

      {/* Settings Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Category Sidebar */}
        <div className="w-48 flex-shrink-0 border-r border-white/10 pr-4">
          <nav className="space-y-1">
            {SETTINGS_CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-400 border-l-2 border-indigo-500'
                      : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{category.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content Area */}
        <div className="flex-1 overflow-y-auto pr-2">
          {renderSettingsContent()}
        </div>
      </div>

      {/* Settings Actions */}
      <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
        <Button variant="secondary" className="flex-1">
          Reset to Defaults
        </Button>
        <Button variant="ghost" className="flex-1">
          Export Settings
        </Button>
        <Button variant="ghost" className="flex-1">
          Import Settings
        </Button>
      </div>
    </Card>
  );
}


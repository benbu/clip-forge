import React, { useState } from 'react';
import { Volume2, Eye, Lock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { Clip } from './Clip';
import { cn } from '@/lib/utils';

export function Track({ track, clips, zoom, visibleDuration }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [volume, setVolume] = useState(100);
  
  return (
    <div className="h-24 border-b border-white/10 hover:bg-zinc-800/30 transition-colors">
      <div className="flex h-full">
        {/* Track Label */}
        <div className="w-40 border-r border-white/10 bg-zinc-800/50 p-2 flex flex-col gap-2">
          <div className="text-xs font-medium text-zinc-300">{track.name}</div>
          
          <div className="flex items-center gap-1">
            <Volume2 className="h-3 w-3 text-zinc-400" />
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="flex-1 h-1"
              disabled={isLocked}
            />
            <span className="text-xs text-zinc-400 w-8">{volume}%</span>
          </div>
          
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3 text-zinc-400" />
            <Switch checked={isVisible} onChange={setIsVisible} />
            
            <Lock className={cn('h-3 w-3', isLocked ? 'text-indigo-400' : 'text-zinc-400')} />
            <Switch checked={isLocked} onChange={setIsLocked} />
            
            <Button size="sm" variant="ghost" icon={<Trash2 className="h-3 w-3" />} iconOnly className="ml-auto" />
          </div>
        </div>
        
        {/* Clip Area */}
        <div className="flex-1 relative overflow-visible">
          {clips.map(clip => (
            <Clip key={clip.id} clip={clip} zoom={zoom} visibleDuration={visibleDuration} />
          ))}
        </div>
      </div>
    </div>
  );
}


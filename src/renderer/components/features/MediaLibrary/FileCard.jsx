import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FileCard({ file, isSelected, onSelect, onDelete }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'media-file',
      file: file
    }));
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  return (
    <div
      className={cn(
        'relative rounded-lg overflow-hidden border transition-all cursor-pointer group',
        'bg-zinc-800/70 border-white/5',
        isSelected && 'ring-2 ring-indigo-500 border-indigo-500',
        'hover:border-zinc-600 hover:shadow-md',
        isDragging && 'opacity-50 scale-95'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-indigo-600/20 to-purple-600/20">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl">🎬</span>
        </div>
        
        {/* Duration Badge */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs text-white">
          {file.duration}
        </div>
      </div>
      
      {/* File Info */}
      <div className="p-2 space-y-1">
        <div className="text-sm font-medium text-zinc-100 truncate">
          {file.name}
        </div>
        
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{file.size}</span>
          <span>•</span>
          <span>{file.resolution}</span>
        </div>
      </div>
      
      {/* Delete Button */}
      {isHovered && (
        <button
          className="absolute top-2 right-2 p-1.5 rounded-md bg-red-600 hover:bg-red-500 text-white transition-opacity opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}


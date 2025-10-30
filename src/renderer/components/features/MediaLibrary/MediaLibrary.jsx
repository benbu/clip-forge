import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Plus, Grid, List } from 'lucide-react';
import { FileCard } from './FileCard';
import { Button } from '@/components/ui/Button';
import { useMediaStore } from '@/store/mediaStore';
import { importVideoFiles } from '@/services/mediaService';
import { usePlayerStore } from '@/store/playerStore';
import { enqueueThumbnailJobs, refreshThumbnailsIfStale, getCachedThumbnail } from '@/services/thumbnailService';
import { checkMissingMedia, relinkFile } from '@/services/missingMediaService';
import { useTimelineStore } from '@/store/timelineStore';


export function MediaLibrary() {
  const {
    files,
    selectedFile,
    removeFile,
    selectFile,
    addFiles,
    sortBy,
    sortDir,
    filterType,
    setSort,
    setFilterType,
    bulkSelectedIds,
    bulkToggle,
    bulkClear,
  } = useMediaStore();
  const [viewMode, setViewMode] = useState('grid');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  // Use actual files from store
  const displayFiles = files;
  
  const handleDeleteFile = (fileId) => {
    removeFile(fileId);
  };
  
  const handleSelectFile = (fileId) => {
    selectFile(fileId);
    // Enter preview mode when selecting media from the library
    const { setPlaybackSource } = usePlayerStore.getState();
    setPlaybackSource('preview');
  };
  
  const handleFileInput = async (e) => {
    const inputFiles = Array.from(e.target.files);
    
    if (inputFiles.length === 0) return;
    
    try {
      // Import files and extract metadata
      const importedFiles = await importVideoFiles(inputFiles);
      
      // Add to store
      addFiles(importedFiles);
      
      // Clear the input
      e.target.value = '';
    } catch (error) {
      console.error('Failed to import files:', error);
    }
  };
  
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    const videoFiles = droppedFiles.filter(file => file.type.startsWith('video/'));
    
    if (videoFiles.length === 0) return;
    
    try {
      // Import files and extract metadata
      const importedFiles = await importVideoFiles(videoFiles);
      
      // Add to store
      addFiles(importedFiles);
    } catch (error) {
      console.error('Failed to import dropped files:', error);
    }
  };
  
  const filteredFiles = useMemo(() => {
    if (!Array.isArray(displayFiles) || displayFiles.length === 0) return [];
    if (filterType === 'all') return displayFiles;
    return displayFiles.filter((f) => (f?.sourceType || 'external') === filterType);
  }, [displayFiles, filterType]);

  const sortedFiles = useMemo(() => {
    const list = [...filteredFiles];
    const dir = sortDir === 'desc' ? -1 : 1;
    list.sort((a, b) => {
      const safeStr = (s) => (typeof s === 'string' ? s : '')
        .toLocaleLowerCase();
      const safeNum = (n) => (Number.isFinite(n) ? n : 0);
      switch (sortBy) {
        case 'duration':
          return (safeNum(a?.durationSeconds) - safeNum(b?.durationSeconds)) * dir;
        case 'size':
          return (safeNum(a?.sizeBytes) - safeNum(b?.sizeBytes)) * dir;
        case 'resolution': {
          const aPx = safeNum(a?.width) * safeNum(a?.height);
          const bPx = safeNum(b?.width) * safeNum(b?.height);
          return (aPx - bPx) * dir;
        }
        case 'createdAt': {
          const aTime = a?.createdAt ? Date.parse(a.createdAt) : 0;
          const bTime = b?.createdAt ? Date.parse(b.createdAt) : 0;
          return (aTime - bTime) * dir;
        }
        case 'name':
        default:
          return safeStr(a?.name).localeCompare(safeStr(b?.name)) * dir;
      }
    });
    return list;
  }, [filteredFiles, sortBy, sortDir]);

  // Background thumbnail generation & cache hydration
  useEffect(() => {
    if (!Array.isArray(files) || files.length === 0) return;
    const { updateFile } = useMediaStore.getState();
    files.forEach((f) => {
      if (!f?.thumbnail) {
        const cached = getCachedThumbnail(f);
        if (cached) updateFile(f.id, { thumbnail: cached });
      }
    });
    refreshThumbnailsIfStale(files);
    const missing = files.filter((f) => !f?.thumbnail);
    if (missing.length > 0) enqueueThumbnailJobs(missing);
  }, [files]);

  // Missing media detection
  useEffect(() => {
    if (!Array.isArray(files) || files.length === 0) return;
    checkMissingMedia(files);
  }, [files]);
  
  return (
    <div className="h-full flex flex-col bg-zinc-900/40 rounded-lg border border-white/10 relative">
      {/* Header */}
      <div className="p-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs uppercase font-semibold text-zinc-400">Media Library</h2>
          <Button 
            size="sm" 
            variant="ghost" 
            icon={<Plus className="h-4 w-4" />} 
            iconOnly
            onClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="video/*"
            onChange={handleFileInput}
            className="hidden"
          />
        </div>
        
        {/* Filters & View Controls */}
        <div className="flex items-center gap-2 mt-2">
          {/* Quick filters */}
          <div className="flex items-center gap-1">
            <button
              className={`px-2 py-0.5 rounded text-xs border ${filterType === 'all' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'}`}
              onClick={() => setFilterType('all')}
            >
              All
            </button>
            <button
              className={`px-2 py-0.5 rounded text-xs border ${filterType === 'recording' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'}`}
              onClick={() => setFilterType('recording')}
            >
              Recordings
            </button>
            <button
              className={`px-2 py-0.5 rounded text-xs border ${filterType === 'external' ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700'}`}
              onClick={() => setFilterType('external')}
            >
              External
            </button>
          </div>

          {/* Sort select */}
          <div className="flex items-center gap-1 ml-auto">
            <select
              className="text-xs bg-zinc-800 border border-white/10 rounded px-2 py-1"
              value={sortBy}
              onChange={(e) => setSort({ sortBy: e.target.value })}
            >
              <option value="name">Name</option>
              <option value="createdAt">Import date</option>
              <option value="duration">Duration</option>
              <option value="size">Size</option>
              <option value="resolution">Resolution</option>
            </select>
            <button
              onClick={() => setSort({ sortDir: sortDir === 'asc' ? 'desc' : 'asc' })}
              className="px-2 py-0.5 rounded text-xs bg-zinc-800 text-zinc-300 border border-white/10 hover:bg-zinc-700"
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortDir === 'asc' ? '↑' : '↓'}
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'text-indigo-400' : 'text-zinc-400'}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'text-indigo-400' : 'text-zinc-400'}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {bulkSelectedIds.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="text-xs text-zinc-300">{bulkSelectedIds.length} selected</div>
            <button
              className="px-2 py-0.5 rounded text-xs bg-red-600 hover:bg-red-500 text-white"
              onClick={() => {
                bulkSelectedIds.forEach((id) => removeFile(id));
                bulkClear();
              }}
            >
              Delete Selected
            </button>
            <button
              className="px-2 py-0.5 rounded text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
              onClick={() => {
                try {
                  const tl = useTimelineStore.getState();
                  let cursor = tl.playheadPosition || 0;
                  const selected = files.filter((f) => bulkSelectedIds.includes(f.id));
                  selected.forEach((f) => {
                    const duration = Number(f.durationSeconds) || 0;
                    const newClip = {
                      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                      mediaFileId: f.id,
                      name: f.name,
                      start: cursor,
                      end: cursor + duration,
                      duration,
                      track: 0,
                      startTrim: 0,
                      endTrim: duration,
                      volume: 100,
                      createdAt: new Date().toISOString(),
                    };
                    tl.addClip(newClip);
                    cursor += duration;
                  });
                  bulkClear();
                } catch (_) {}
              }}
              disabled={bulkSelectedIds.length === 0}
            >
              Add to Timeline
            </button>
            <button
              className="px-2 py-0.5 rounded text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
              onClick={() => bulkClear()}
            >
              Clear
            </button>
          </div>
        )}
      </div>
      
      {/* File List */}
      <div 
        className={`flex-1 overflow-y-auto p-3 ${isDragging ? 'bg-indigo-900/20 border-2 border-dashed border-indigo-500' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {sortedFiles.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12">
            <p>No media files</p>
            <p className="text-xs mt-1">Drag files here or click import</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-[repeat(auto-fill,minmax(200px,200px))] gap-2 justify-start content-start' : 'space-y-2'}>
            {sortedFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFile === file.id}
                onSelect={() => handleSelectFile(file.id)}
                onDelete={() => handleDeleteFile(file.id)}
                onRelink={() => relinkFile(file.id)}
                bulkSelected={bulkSelectedIds.includes(file.id)}
                onBulkToggle={() => bulkToggle(file.id)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

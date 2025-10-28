import React, { useState, useRef } from 'react';
import { Plus, Grid, List } from 'lucide-react';
import { FileCard } from './FileCard';
import { Button } from '@/components/ui/Button';
import { useMediaStore } from '@/store/mediaStore';
import { importVideoFiles } from '@/services/mediaService';
import { usePlayerStore } from '@/store/playerStore';


export function MediaLibrary() {
  const { files, selectedFile, removeFile, selectFile, addFiles } = useMediaStore();
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
  
  const filteredFiles = displayFiles;
  
  return (
    <div className="h-full flex flex-col bg-zinc-900/40 rounded-lg border border-white/10">
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
        
        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 mt-2">
          <select className="text-xs bg-zinc-800 border border-white/10 rounded px-2 py-1">
            <option>Name</option>
            <option>Date</option>
            <option>Duration</option>
            <option>Size</option>
          </select>
          <div className="flex items-center gap-1 ml-auto">
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
      </div>
      
      {/* File List */}
      <div 
        className={`flex-1 overflow-y-auto p-3 ${isDragging ? 'bg-indigo-900/20 border-2 border-dashed border-indigo-500' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {filteredFiles.length === 0 ? (
          <div className="text-center text-zinc-500 text-sm py-12">
            <p>No media files</p>
            <p className="text-xs mt-1">Drag files here or click import</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 gap-2' : 'space-y-2'}>
            {filteredFiles.map(file => (
              <FileCard
                key={file.id}
                file={file}
                isSelected={selectedFile === file.id}
                onSelect={() => handleSelectFile(file.id)}
                onDelete={() => handleDeleteFile(file.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

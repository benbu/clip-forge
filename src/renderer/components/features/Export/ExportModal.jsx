import React, { useMemo, useState } from 'react';
import { X, Download, Monitor, FileVideo } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { exportService } from '@/services/exportService';
import { useSettingsStore } from '@/store/settingsStore';
import { useTimelineStore } from '@/store/timelineStore';
import { formatFileSize, formatDuration } from '@/lib/fileUtils';

export function ExportModal({ isOpen, onClose }) {
  const { clips } = useTimelineStore();
  const settings = useSettingsStore((s) => s.export);

  const defaultQuality = useMemo(() => {
    const res = settings?.resolution;
    if (res === '3840x2160') return '4k';
    if (res === '1920x1080' || res == null) return '1080p';
    if (res === '1280x720') return '720p';
    return 'source';
  }, [settings?.resolution]);

  const [quality, setQuality] = useState(defaultQuality);
  const [format, setFormat] = useState(settings?.format || 'mp4');
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const presets = [
    { id: '720p', label: '720p HD', resolution: '1280x720' },
    { id: '1080p', label: '1080p Full HD', resolution: '1920x1080' },
    { id: '4k', label: '4K Ultra HD', resolution: '3840x2160' },
    { id: 'source', label: 'Source', resolution: 'Original' },
  ];
  
  const formats = [
    { id: 'mp4', label: 'MP4 (H.264)', extension: '.mp4' },
    { id: 'webm', label: 'WebM (VP9)', extension: '.webm' },
    { id: 'mov', label: 'MOV (QuickTime)', extension: '.mov' },
  ];
  
  const estimatedSize = clips.length * 50; // Rough estimate: 50MB per clip
  const estimatedDuration = clips.reduce((total, clip) => total + (clip.duration || 0), 0);
  
  const handleExport = async () => {
    setIsExporting(true);
    setProgress(0);
    setError(null);
    
    try {
      exportService.onProgress((percent) => setProgress(percent));
      
      const exportOptions = exportService.getExportPreset(quality);
      
      const result = await exportService.exportTimeline({
        ...exportOptions,
        format,
        outputPath: null // Will use default or prompt
      });
      
      // Show success and close
      setTimeout(() => {
        onClose();
        setIsExporting(false);
        setProgress(0);
      }, 1000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.message || 'Export failed');
    }
  };
  
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Video"
      size="large"
    >
      <div className="space-y-6">
        {/* Preview Info */}
        <div className="bg-zinc-900/60 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <FileVideo className="h-4 w-4" />
              <span>Timeline Preview</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-zinc-400 mb-1">Clips</div>
              <div className="text-white font-semibold">{clips.length}</div>
            </div>
            <div>
              <div className="text-zinc-400 mb-1">Duration</div>
              <div className="text-white font-semibold">{formatDuration(estimatedDuration)}</div>
            </div>
            <div>
              <div className="text-zinc-400 mb-1">Est. Size</div>
              <div className="text-white font-semibold">{formatFileSize(estimatedSize * 1024 * 1024)}</div>
            </div>
          </div>
        </div>
        
        {/* Quality Preset */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Quality Preset
          </label>
          <div className="grid grid-cols-2 gap-3">
            {presets.map(preset => (
              <button
                key={preset.id}
                onClick={() => setQuality(preset.id)}
                className={`p-3 rounded-lg border-2 text-left transition-all ${
                  quality === preset.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 bg-zinc-900/40 hover:border-white/20'
                }`}
              >
                <div className="font-medium text-white">{preset.label}</div>
                <div className="text-xs text-zinc-400 mt-1">{preset.resolution}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">
            Video Format
          </label>
          <div className="flex gap-3">
            {formats.map(f => (
              <button
                key={f.id}
                onClick={() => setFormat(f.id)}
                className={`flex-1 p-3 rounded-lg border-2 text-center transition-all ${
                  format === f.id
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 bg-zinc-900/40 hover:border-white/20'
                }`}
              >
                <div className="font-medium text-white">{f.label}</div>
                <div className="text-xs text-zinc-400 mt-1">{f.extension}</div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Progress Bar */}
        {isExporting && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Exporting...</span>
              <span className="text-indigo-400">{progress}%</span>
            </div>
            <Slider
              value={progress}
              min={0}
              max={100}
              disabled
              showValue={false}
            />
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 text-sm text-red-400">
            {error}
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            disabled={isExporting || clips.length === 0}
            loading={isExporting}
          >
            {isExporting ? 'Exporting...' : 'Export Video'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}


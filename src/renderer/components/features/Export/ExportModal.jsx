import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCopy,
  Clock,
  Download,
  FileText,
  FileVideo,
  FolderOpen,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Slider } from '@/components/ui/Slider';
import { Input } from '@/components/ui/Input';
import { Dropdown } from '@/components/ui/Dropdown';
import { exportService } from '@/services/exportService';
import { useSettingsStore } from '@/store/settingsStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useExportQueueStore } from '@/store/exportQueueStore';
import { formatDuration, formatFileSize } from '@/lib/fileUtils';
import { cn } from '@/lib/utils';

const PRESET_OPTIONS = [
  {
    id: '1080p',
    label: '1080p Full HD',
    resolution: '1920x1080',
    fps: 60,
    bitrate: '8000k',
    description: 'Standard 16:9 output for most platforms',
  },
  {
    id: '4k',
    label: '4K Ultra HD',
    resolution: '3840x2160',
    fps: 60,
    bitrate: '25000k',
    description: 'High fidelity 4K exports',
  },
  {
    id: 'square1080',
    label: 'Square 1080',
    resolution: '1080x1080',
    fps: 30,
    bitrate: '6000k',
    description: '1:1 aspect for Instagram feed & Facebook',
  },
  {
    id: 'vertical1080',
    label: 'Vertical 1080x1920',
    resolution: '1080x1920',
    fps: 60,
    bitrate: '10000k',
    description: 'Vertical format for Reels, Shorts, TikTok',
  },
  {
    id: 'source',
    label: 'Match Source',
    resolution: null,
    fps: null,
    bitrate: null,
    description: 'Use timeline resolution, frame rate, and quality',
  },
];

const FORMAT_OPTIONS = [
  { id: 'mp4', label: 'MP4 (H.264)', extension: '.mp4', codec: 'libx264', note: 'Best compatibility' },
  { id: 'webm', label: 'WebM (VP9 + Opus)', extension: '.webm', codec: 'libvpx-vp9', note: 'Web-optimized, smaller files' },
  { id: 'mov', label: 'MOV (ProRes 422)', extension: '.mov', codec: 'prores_ks', note: 'High quality for editing workflows' },
];

const STAGE_LABELS = {
  preparing: 'Preparing media',
  merging: 'Merging clips',
  encoding: 'Encoding video',
  saving: 'Writing to disk',
  validating: 'Validating export',
  completed: 'Completed',
  pending: 'Queued',
  processing: 'Processing',
  cancelling: 'Cancelling',
  cancelled: 'Cancelled',
  failed: 'Failed',
};

const BITRATE_DEFAULTS = ['4000k', '6000k', '8000k', '10000k', '15000k'];

const createDefaultTitle = () => {
  const now = new Date();
  const localeDate = now.toLocaleDateString();
  const localeTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return `ClipForge Export — ${localeDate} ${localeTime}`;
};

const extensionForFormat = (format = 'mp4') => {
  const lower = String(format || 'mp4').toLowerCase();
  if (lower === 'webm') return '.webm';
  if (lower === 'mov') return '.mov';
  return '.mp4';
};

const parseBitrate = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^([0-9]+(?:\.[0-9]+)?)(m|k|)$/i);
  if (!match) return null;
  const numeric = Number(match[1]);
  if (!Number.isFinite(numeric)) return null;
  const unit = (match[2] || 'k').toLowerCase();
  const bits = unit === 'm' ? numeric * 1_000_000 : unit === 'k' ? numeric * 1_000 : numeric;
  return bits;
};

const computeEstimatedSize = (bitrate, durationSeconds) => {
  const bitsPerSecond = parseBitrate(bitrate);
  if (!bitsPerSecond || !durationSeconds) return null;
  const bytesPerSecond = bitsPerSecond / 8;
  const bytes = bytesPerSecond * durationSeconds;
  return bytes;
};

const formatDurationVerbose = (seconds) => {
  if (!seconds) return '0s';
  if (seconds < 60) return `${Math.round(seconds)}s`;
  return formatDuration(seconds);
};

const statusBadgeStyles = {
  pending: 'bg-amber-500/10 text-amber-300 border border-amber-500/30',
  processing: 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30',
  completed: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30',
  failed: 'bg-rose-500/10 text-rose-300 border border-rose-500/30',
  cancelled: 'bg-zinc-700/40 text-zinc-300 border border-zinc-500/30',
  cancelling: 'bg-zinc-700/40 text-zinc-300 border border-zinc-500/30',
};

const formatStatusLabel = (status) => {
  const formatted = String(status || '').toLowerCase();
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const getStageLabel = (stage) => STAGE_LABELS[stage] || 'In progress';

const getPresetById = (id) => PRESET_OPTIONS.find((preset) => preset.id === id) || PRESET_OPTIONS[0];

const getFormatOption = (id) => FORMAT_OPTIONS.find((option) => option.id === id) || FORMAT_OPTIONS[0];

const toSafeBitrateString = (value) => {
  if (!value) return '';
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (/^[0-9]+$/i.test(trimmed)) return `${trimmed}k`;
  return trimmed.toLowerCase();
};

const buildLogText = (job) => {
  if (!job?.logs?.length) return '';
  return job.logs
    .map((entry) => {
      if (typeof entry === 'string') return entry;
      const timestamp = entry.timestamp ? `[${entry.timestamp}] ` : '';
      const stage = entry.stage ? `(${entry.stage}) ` : '';
      return `${timestamp}${stage}${entry.level ? entry.level.toUpperCase() + ': ' : ''}${entry.message ?? ''}`.trim();
    })
    .join('\n');
};

const ExportQueueList = ({ jobs, currentJobId }) => {
  if (!jobs.length) {
    return (
      <div className="text-sm text-zinc-400 bg-zinc-900/40 border border-white/5 rounded-lg px-3 py-2">
        Queue is empty — exports will start immediately.
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-48 overflow-y-auto">
      {jobs.map((job) => {
        const jobStatus = job.status || 'pending';
        const badgeClass = statusBadgeStyles[jobStatus] || statusBadgeStyles.pending;
        const stageLabel = getStageLabel(job.stage || jobStatus);
        return (
          <div
            key={job.id}
            className={cn(
              'rounded-lg border border-white/5 bg-zinc-900/50 p-3',
              job.id === currentJobId && 'border-indigo-500/60 bg-indigo-500/5'
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium text-white line-clamp-1">
                {job.metadata?.title || 'Untitled export'}
              </div>
              <span className={cn('text-xs px-2 py-0.5 rounded-full capitalize', badgeClass)}>
                {formatStatusLabel(jobStatus)}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
              <span>{stageLabel}</span>
              <span className="text-zinc-600">•</span>
              <span>{job.options?.format?.toUpperCase() || 'MP4'}</span>
              {job.progress != null && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{job.progress}%</span>
                </>
              )}
            </div>
            <div className="mt-2">
              <Slider value={job.progress || 0} min={0} max={100} showValue={false} disabled />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function ExportModal({ isOpen, onClose }) {
  const { clips } = useTimelineStore();
  const settings = useSettingsStore((state) => state.export);
  const setExportSettings = useSettingsStore((state) => state.setExportSettings);

  const { jobs, paused } = useExportQueueStore(
    useCallback(
      (state) => ({
        jobs: state.jobs,
        paused: state.paused,
      }),
      []
    )
  );

  const [step, setStep] = useState('configure'); // configure | summary | progress | result
  const [presetId, setPresetId] = useState('1080p');
  const [format, setFormat] = useState('mp4');
  const [fps, setFps] = useState(60);
  const [bitrate, setBitrate] = useState('8000k');
  const [metadata, setMetadata] = useState({ title: createDefaultTitle(), notes: '' });
  const [outputPath, setOutputPath] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isChoosingPath, setIsChoosingPath] = useState(false);

  const selectedPreset = useMemo(() => getPresetById(presetId), [presetId]);
  const formatOption = useMemo(() => getFormatOption(format), [format]);
  const currentJob = useMemo(() => (jobId ? jobs.find((job) => job.id === jobId) || null : null), [jobId, jobs]);
  const timelineDuration = useMemo(
    () => clips.reduce((total, clip) => total + (clip.duration || 0), 0),
    [clips]
  );

  const estimatedBytes = useMemo(
    () => computeEstimatedSize(bitrate, timelineDuration),
    [bitrate, timelineDuration]
  );

  useEffect(() => {
    if (!isOpen) return;

    const defaultPreset = (() => {
      if (!settings?.resolution) return '1080p';
      const match = PRESET_OPTIONS.find((preset) => preset.resolution === settings.resolution);
      return match ? match.id : settings.resolution === null ? 'source' : '1080p';
    })();

    setStep('configure');
    setPresetId(defaultPreset);
    setFormat(settings?.format || 'mp4');
    setFps(settings?.fps || getPresetById(defaultPreset).fps || 60);
    setBitrate(settings?.bitrate || getPresetById(defaultPreset).bitrate || '8000k');
    setMetadata({ title: createDefaultTitle(), notes: '' });
    setOutputPath(null);
    setJobId(null);
    setResult(null);
    setError(null);
  }, [isOpen, settings?.bitrate, settings?.format, settings?.fps, settings?.resolution]);

  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    exportService
      .awaitJob(jobId)
      .then((jobResult) => {
        if (cancelled) return;
        setResult(jobResult);
        setError(null);
        setStep('result');
      })
      .catch((jobError) => {
        if (cancelled) return;
        setResult(null);
        setError(jobError);
        setStep('result');
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const handleClose = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handlePresetSelect = useCallback(
    (id) => {
      setPresetId(id);
      const preset = getPresetById(id);
      if (preset.fps) {
        setFps(preset.fps);
      }
      if (preset.bitrate) {
        setBitrate(preset.bitrate);
      }
    },
    []
  );

  const handleChoosePath = useCallback(async () => {
    if (!window?.electronAPI?.chooseExportPath) return;
    setIsChoosingPath(true);
    try {
      const extension = extensionForFormat(format);
      const fallbackName = `${metadata.title || createDefaultTitle()}${extension}`.replace(/\s+/g, ' ').trim();
      const selected = await window.electronAPI.chooseExportPath(fallbackName);
      if (selected) {
        setOutputPath(selected);
      }
    } finally {
      setIsChoosingPath(false);
    }
  }, [format, metadata.title]);

  const handleProceedToSummary = useCallback(() => {
    setStep('summary');
  }, []);

  const handleBackToConfigure = useCallback(() => {
    setStep('configure');
  }, []);

  const handleQueueExport = useCallback(() => {
    const effectiveMetadata = {
      title: metadata.title?.trim() || createDefaultTitle(),
      notes: metadata.notes || '',
    };

    const options = {
      resolution: selectedPreset.resolution,
      fps: Number(fps) || selectedPreset.fps || 60,
      bitrate: toSafeBitrateString(bitrate) || selectedPreset.bitrate || '8000k',
      format,
    };

    setExportSettings({
      resolution: options.resolution,
      fps: options.fps,
      format: options.format,
      bitrate: options.bitrate,
    });

    const job = exportService.enqueueExport({
      options,
      metadata: effectiveMetadata,
      outputPath,
    });

    setJobId(job.id);
    setResult(null);
    setError(null);
    setStep('progress');
  }, [
    bitrate,
    format,
    fps,
    metadata.notes,
    metadata.title,
    outputPath,
    selectedPreset.bitrate,
    selectedPreset.fps,
    selectedPreset.resolution,
    setExportSettings,
  ]);

  const handleCancelJob = useCallback(() => {
    if (!jobId) return;
    exportService.cancelJob(jobId);
  }, [jobId]);

  const handleToggleQueuePause = useCallback(() => {
    if (paused) {
      exportService.resumeQueue();
    } else {
      exportService.pauseQueue();
    }
  }, [paused]);

  const handleRevealInFinder = useCallback(async () => {
    const targetPath = result?.filePath;
    if (!targetPath || !window?.electronAPI?.revealInFolder) return;
    try {
      await window.electronAPI.revealInFolder(targetPath);
    } catch (_) {
      // noop — reveal fails silently on some platforms without Finder/Explorer
    }
  }, [result?.filePath]);

  const handleCopyPath = useCallback(async () => {
    const targetPath = result?.filePath;
    if (!targetPath || !navigator?.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(targetPath);
    } catch (_) {
      // ignore copy failures
    }
  }, [result?.filePath]);

  const handleDownloadLogs = useCallback(() => {
    const job = currentJob || result;
    const logText = buildLogText(job);
    if (!logText) return;
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clipforge-export-${job?.id || Date.now()}.log`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [currentJob, result]);

  const handleRetry = useCallback(() => {
    if (!jobId) return;
    const retryJob = exportService.retryJob(jobId);
    if (!retryJob) return;
    setJobId(retryJob.id);
    setResult(null);
    setError(null);
    setStep('progress');
  }, [jobId]);

  const renderConfigureStep = () => (
    <div className="space-y-6">
      <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <FileVideo className="h-4 w-4" />
            <span>Timeline Overview</span>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-zinc-400">Clips</div>
            <div className="text-white font-semibold">{clips.length}</div>
          </div>
          <div>
            <div className="text-zinc-400">Duration</div>
            <div className="text-white font-semibold">{formatDurationVerbose(timelineDuration)}</div>
          </div>
          <div>
            <div className="text-zinc-400">Est. Size</div>
            <div className="text-white font-semibold">
              {estimatedBytes ? formatFileSize(estimatedBytes) : '—'}
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-3">Quality Preset</label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_OPTIONS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset.id)}
              className={cn(
                'w-full text-left p-4 rounded-lg border-2 transition-all',
                presetId === preset.id
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-white/10 bg-zinc-900/40 hover:border-white/20'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-white font-medium">{preset.label}</div>
                  <div className="text-xs text-zinc-400 mt-1">{preset.description}</div>
                </div>
                {presetId === preset.id && <CheckCircle2 className="h-5 w-5 text-indigo-400" />}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                <span>{preset.resolution || 'Match Timeline'}</span>
                <span className="text-zinc-600">•</span>
                <span>{preset.fps ? `${preset.fps} fps` : 'Timeline fps'}</span>
                <span className="text-zinc-600">•</span>
                <span>{preset.bitrate ? preset.bitrate.toUpperCase() : 'Adaptive bitrate'}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Format</label>
          <Dropdown
            options={FORMAT_OPTIONS.map((option) => ({
              value: option.id,
              label: `${option.label}`,
            }))}
            value={format}
            onChange={setFormat}
          />
          <div className="mt-2 text-xs text-zinc-500 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            <span>{formatOption.note}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Frame Rate (fps)</label>
          <Input
            type="number"
            min={15}
            max={120}
            step={1}
            value={fps}
            onChange={(event) => setFps(Number(event.target.value) || 0)}
          />
          <div className="mt-2 text-xs text-zinc-500">
            Enter a value between 15 and 120.
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Target Bitrate</label>
          <Input
            type="text"
            value={bitrate}
            onChange={(event) => setBitrate(event.target.value)}
            onBlur={() => setBitrate(toSafeBitrateString(bitrate) || '8000k')}
          />
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-400">
            {BITRATE_DEFAULTS.map((option) => (
              <button
                key={option}
                onClick={() => setBitrate(option)}
                className={cn(
                  'px-2 py-1 rounded-md border border-white/10 hover:border-white/20 transition-colors',
                  bitrate === option && 'border-indigo-500 text-indigo-400'
                )}
              >
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">Codec</label>
          <div className="px-3 py-2 rounded-md border border-white/10 bg-zinc-900/60 text-sm text-zinc-200">
            {formatOption.codec}
          </div>
          <div className="mt-2 text-xs text-zinc-500">
            Codec automatically chosen for the selected container.
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleProceedToSummary}
          disabled={clips.length === 0}
          icon={<Download className="h-4 w-4" />}
          iconPosition="right"
        >
          Review Export
        </Button>
      </div>
    </div>
  );

  const renderSummaryStep = () => (
    <div className="space-y-6">
      <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4 space-y-3">
        <div className="text-sm text-zinc-400">Export Configuration</div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-zinc-500">Preset</div>
            <div className="text-white font-medium">{selectedPreset.label}</div>
          </div>
          <div>
            <div className="text-zinc-500">Resolution</div>
            <div className="text-white font-medium">{selectedPreset.resolution || 'Match Timeline'}</div>
          </div>
          <div>
            <div className="text-zinc-500">Frame Rate</div>
            <div className="text-white font-medium">{Number(fps) || selectedPreset.fps || 'Timeline fps'} fps</div>
          </div>
          <div>
            <div className="text-zinc-500">Bitrate</div>
            <div className="text-white font-medium">{toSafeBitrateString(bitrate).toUpperCase()}</div>
          </div>
          <div>
            <div className="text-zinc-500">Container</div>
            <div className="text-white font-medium">{formatOption.label}</div>
          </div>
          <div>
            <div className="text-zinc-500">Estimated Size</div>
            <div className="text-white font-medium">
              {estimatedBytes ? formatFileSize(estimatedBytes) : '—'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Export Title</label>
            <Input
              value={metadata.title}
              onChange={(event) =>
                setMetadata((prev) => ({ ...prev, title: event.target.value }))
              }
              placeholder="Export title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Project Notes</label>
            <textarea
              value={metadata.notes}
              onChange={(event) =>
                setMetadata((prev) => ({ ...prev, notes: event.target.value }))
              }
              rows={4}
              className="w-full resize-none rounded-md border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Optional notes saved with diagnostics."
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4">
            <div className="text-sm text-zinc-400 mb-2">Destination</div>
            <div className="text-sm text-white break-words">
              {outputPath || 'Choose a destination on the next step or use default Videos folder.'}
            </div>
            <div className="mt-3">
              <Button
                variant="secondary"
                onClick={handleChoosePath}
                isLoading={isChoosingPath}
                disabled={!window?.electronAPI?.chooseExportPath}
              >
                Select Location
              </Button>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4">
            <div className="flex items-center justify-between text-sm text-zinc-400">
              <span>Export Queue</span>
              <span>{jobs.length} job{jobs.length === 1 ? '' : 's'}</span>
            </div>
            <div className="mt-3">
              <ExportQueueList jobs={jobs} currentJobId={jobId} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={handleBackToConfigure}>
          Back
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleQueueExport}
            icon={<Download className="h-4 w-4" />}
            iconPosition="right"
            disabled={clips.length === 0}
          >
            Enqueue Export
          </Button>
        </div>
      </div>
    </div>
  );

  const renderProgressStep = () => {
    const jobStatus = currentJob?.status || 'pending';
    const stageLabel = getStageLabel(currentJob?.stage || jobStatus);
    const percent = currentJob?.progress ?? 0;
    const etaSeconds = currentJob?.etaSeconds;
    const queuePosition = jobs.findIndex((job) => job.id === jobId) + 1;

    return (
      <div className="space-y-6">
        <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">Export Status</div>
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full capitalize',
                statusBadgeStyles[jobStatus] || statusBadgeStyles.pending
              )}
            >
              {formatStatusLabel(jobStatus)}
            </span>
          </div>
          <div className="mt-3 space-y-2 text-sm text-zinc-300">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-zinc-400" />
              <span>{stageLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Queue Position: {queuePosition}</span>
              <span className="text-zinc-600">•</span>
              <span>
                ETA: {etaSeconds == null ? 'calculating…' : etaSeconds === 0 ? 'done' : formatDurationVerbose(etaSeconds)}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <Slider value={percent} min={0} max={100} showValue={false} disabled />
            <div className="mt-2 text-sm text-zinc-400">{percent}% complete</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-zinc-400">Queue</div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleQueuePause}
              icon={paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            >
              {paused ? 'Resume Queue' : 'Pause Queue'}
            </Button>
          </div>
          <div className="mt-3">
            <ExportQueueList jobs={jobs} currentJobId={jobId} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleDownloadLogs}
              disabled={!currentJob?.logs?.length}
            >
              Download Logs
            </Button>
            <Button
              variant="secondary"
              className="text-rose-300 hover:text-rose-200 hover:bg-rose-500/10"
              onClick={handleCancelJob}
            >
              Cancel Export
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderResultStep = () => {
    const success = Boolean(result);
    const jobForLogs = currentJob || result;
    const validation = result?.validation;
    const validationChecks = [
      {
        label: 'File saved',
        ok: validation?.fileExists !== false,
        detail: validation?.filePath,
      },
      {
        label: 'Duration matches timeline',
        ok: validation?.durationMatch !== false,
        detail: validation?.durationMatch === false ? 'Duration differs from timeline' : null,
      },
      {
        label: 'Probe metadata',
        ok: validation?.probeError == null,
        detail: validation?.probeError,
      },
    ];

    return (
      <div className="space-y-6">
        {success ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 mt-0.5" />
            <div>
              <div className="text-emerald-200 font-medium">Export completed successfully</div>
              <div className="text-sm text-emerald-200/80 mt-1">
                {result.metadata?.title || 'Export finished'}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-rose-300 mt-0.5" />
            <div>
              <div className="text-rose-200 font-medium">
                {error?.name === 'ExportCancelledError' ? 'Export cancelled' : 'Export failed'}
              </div>
              <div className="text-sm text-rose-200/80 mt-1">
                {error?.message || 'Something went wrong during export.'}
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4 space-y-3">
            <div className="text-sm text-zinc-400">Export Details</div>
            <div className="text-sm text-white break-words">{result.filePath}</div>
            <div className="grid grid-cols-2 gap-4 text-sm text-zinc-300">
              <div>
                <div className="text-zinc-500">Size</div>
                <div className="text-white font-medium">{formatFileSize(result.size)}</div>
              </div>
              <div>
                <div className="text-zinc-500">Duration</div>
                <div className="text-white font-medium">{formatDurationVerbose(result.duration)}</div>
              </div>
              <div>
                <div className="text-zinc-500">Format</div>
                <div className="text-white font-medium">{result.options?.format?.toUpperCase() || 'MP4'}</div>
              </div>
              <div>
                <div className="text-zinc-500">Bitrate</div>
                <div className="text-white font-medium">{(result.options?.bitrate || '').toUpperCase()}</div>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {validationChecks.map((check) => (
                <div key={check.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-zinc-300">{check.label}</span>
                  <span className={cn('text-sm', check.ok ? 'text-emerald-300' : 'text-rose-300')}>
                    {check.ok ? 'OK' : 'Check'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-zinc-900/60 border border-white/10 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm text-zinc-400">
            <span>Logs</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownloadLogs}
              disabled={!jobForLogs?.logs?.length}
            >
              <RefreshCw className="h-4 w-4 mr-2" /> Download
            </Button>
          </div>
          <div className="mt-3 max-h-40 overflow-y-auto bg-black/40 border border-white/5 rounded-lg p-3 text-xs font-mono text-zinc-300 whitespace-pre-wrap">
            {jobForLogs?.logs?.length ? buildLogText(jobForLogs) : 'No log entries captured for this export.'}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {success && (
              <>
                <Button variant="secondary" icon={<FolderOpen className="h-4 w-4" />} onClick={handleRevealInFinder}>
                  Reveal in Finder
                </Button>
                <Button variant="ghost" icon={<ClipboardCopy className="h-4 w-4" />} onClick={handleCopyPath}>
                  Copy Path
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!success && (
              <Button variant="secondary" onClick={handleRetry} icon={<RefreshCw className="h-4 w-4" />}>
                Retry Export
              </Button>
            )}
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
            <Button variant="primary" onClick={() => setStep('configure')}>
              New Export
            </Button>
          </div>
        </div>
      </div>
    );
  };

  let content;
  if (step === 'configure') {
    content = renderConfigureStep();
  } else if (step === 'summary') {
    content = renderSummaryStep();
  } else if (step === 'progress') {
    content = renderProgressStep();
  } else {
    content = renderResultStep();
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 'configure' ? 'Export Video' : step === 'summary' ? 'Review Export' : step === 'progress' ? 'Export Queue' : 'Export Result'}
      size="large"
    >
      {content}
    </Modal>
  );
}


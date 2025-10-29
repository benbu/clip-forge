import { useMediaStore } from '@/store/mediaStore';
import { useTimelineStore } from '@/store/timelineStore';
import { useWaveformStore } from '@/store/waveformStore';
import { computeWaveformPeaks } from './waveformService';

const requestedMedia = new Set();
const queue = [];
let processing = false;
let mediaUnsubscribe = null;
let initialized = false;

const getArrayBufferFromSource = async (job) => {
  const { source } = job;
  if (source?.arrayBuffer) {
    return source.arrayBuffer instanceof Promise
      ? await source.arrayBuffer
      : await source.arrayBuffer();
  }

  if (source?.file?.arrayBuffer) {
    return await source.file.arrayBuffer();
  }

  if (source?.blob?.arrayBuffer) {
    return await source.blob.arrayBuffer();
  }

  if (source?.buffer instanceof ArrayBuffer) {
    return source.buffer.slice(0);
  }

  if (ArrayBuffer.isView(source?.buffer)) {
    const view = source.buffer;
    return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
  }

  if (ArrayBuffer.isView(source)) {
    return source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength);
  }

  if (source instanceof ArrayBuffer) {
    return source.slice(0);
  }

  const mediaState = useMediaStore.getState();
  const media = mediaState.files.find((file) => file.id === job.mediaId) || job.media;
  if (media?.originalFile?.arrayBuffer) {
    return await media.originalFile.arrayBuffer();
  }

  if (mediaState.fileBlobUrls?.[job.mediaId]) {
    const response = await fetch(mediaState.fileBlobUrls[job.mediaId]);
    return await response.arrayBuffer();
  }

  if (media?.path && window?.electronAPI?.readFile) {
    const bytes = await window.electronAPI.readFile(media.path);
    if (bytes instanceof Uint8Array) {
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    }
    if (Array.isArray(bytes)) {
      return new Uint8Array(bytes).buffer;
    }
  }

  throw new Error('Unable to resolve media source for waveform extraction');
};

const processQueue = async () => {
  if (processing) return;
  const job = queue.shift();
  if (!job) return;
  processing = true;
  const { mediaId } = job;

  try {
    useWaveformStore.getState().setProcessing(mediaId);
    const arrayBuffer = await getArrayBufferFromSource(job);
    const waveform = await computeWaveformPeaks(arrayBuffer, job.options);

    useMediaStore.getState().updateFile(mediaId, { waveform });
    useTimelineStore.getState().setMediaWaveform(mediaId, waveform);
    useWaveformStore.getState().setReady(mediaId, waveform);
  } catch (error) {
    console.error('Waveform extraction failed', error);
    useWaveformStore.getState().setError(mediaId, error);
  } finally {
    processing = false;
    processQueue();
  }
};

const enqueueJob = (job) => {
  queue.push(job);
  processQueue();
};

const shouldSkip = (media) => {
  if (!media?.id) return true;
  if (media.waveform?.peaks?.length) {
    useWaveformStore.getState().setReady(media.id, media.waveform);
    requestedMedia.add(media.id);
    return true;
  }
  const status = useWaveformStore.getState().getStatus(media.id);
  if (status?.state === 'processing' || status?.state === 'pending') {
    return true;
  }
  if (status?.state === 'ready') {
    return true;
  }
  return false;
};

const buildJob = (media, source, options = {}) => ({
  mediaId: media.id,
  media,
  source: source ?? {},
  options,
});

export const waveformQueue = {
  ensure(media, source, options) {
    if (!media?.id) return;
    if (shouldSkip(media)) {
      return;
    }
    if (requestedMedia.has(media.id)) {
      return;
    }
    requestedMedia.add(media.id);
    useWaveformStore.getState().setPending(media.id);
    enqueueJob(buildJob(media, source, options));
  },

  registerPrecomputed(mediaId, waveform) {
    if (!mediaId) return;
    requestedMedia.add(mediaId);
    useWaveformStore.getState().setReady(mediaId, waveform);
  },

  retry(mediaId) {
    if (!mediaId) return;
    requestedMedia.delete(mediaId);
    useWaveformStore.getState().clear(mediaId);
    const media = useMediaStore.getState().files.find((file) => file.id === mediaId);
    if (media) {
      this.ensure(media);
    }
  },

  bootstrap() {
    if (initialized) return;
    initialized = true;
    const mediaState = useMediaStore.getState();
    mediaState.files.forEach((file) => this.ensure(file));

    mediaUnsubscribe = useMediaStore.subscribe(
      (state) => state.files,
      (files) => {
        files.forEach((file) => this.ensure(file));
      }
    );
  },

  teardown() {
    if (mediaUnsubscribe) {
      mediaUnsubscribe();
      mediaUnsubscribe = null;
    }
    initialized = false;
    requestedMedia.clear();
  },
};


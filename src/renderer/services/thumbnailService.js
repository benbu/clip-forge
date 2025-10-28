import { useMediaStore } from '@/store/mediaStore';
import { importVideoFiles } from '@/services/mediaService';
import { generateThumbnail as ffmpegGenerateThumbnail } from '@/services/videoService';

// Simple localStorage-backed cache
const NAMESPACE = 'clipforge:thumbcache:v1';

function getCache() {
  try {
    const raw = localStorage.getItem(NAMESPACE);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function setCache(cache) {
  try {
    localStorage.setItem(NAMESPACE, JSON.stringify(cache));
  } catch {}
}

function computeKey(file) {
  const path = file?.path || file?.name || 'unknown';
  const size = Number(file?.sizeBytes || 0);
  const dur = Number(file?.durationSeconds || 0);
  return `${path}|${size}|${dur}`;
}

export function getCachedThumbnail(file) {
  const cache = getCache();
  const key = computeKey(file);
  return cache[key] || null;
}

function putCachedThumbnail(file, dataUrl) {
  const cache = getCache();
  const key = computeKey(file);
  cache[key] = dataUrl;
  setCache(cache);
}

let queue = [];
let isRunning = false;

export function enqueueThumbnailJobs(files) {
  const pending = (files || []).filter(Boolean);
  if (pending.length === 0) return;
  queue.push(...pending);
  if (!isRunning) runQueue();
}

async function runQueue() {
  if (isRunning) return;
  isRunning = true;
  try {
    while (queue.length > 0) {
      const file = queue.shift();
      await generateAndStore(file);
    }
  } finally {
    isRunning = false;
  }
}

async function generateAndStore(file) {
  if (!file) return;
  const store = useMediaStore.getState();
  // Cache hit
  const cached = getCachedThumbnail(file);
  if (cached && !file.thumbnail) {
    store.updateFile(file.id, { thumbnail: cached });
    return;
  }

  // Try generating
  let dataUrl = null;
  try {
    if (file.originalFile instanceof File) {
      // Reuse mediaService path for canvas-based generation
      const [withThumb] = await importVideoFiles([file.originalFile]);
      dataUrl = withThumb?.thumbnail || null;
    } else if (file.path) {
      // Use ffmpeg worker fallback if available
      try {
        dataUrl = await ffmpegGenerateThumbnail(file.path, 1);
      } catch (_) {
        dataUrl = null;
      }
    }
  } catch (_) {
    dataUrl = null;
  }

  if (dataUrl) {
    putCachedThumbnail(file, dataUrl);
    store.updateFile(file.id, { thumbnail: dataUrl });
  }
}

export function refreshThumbnailsIfStale(files) {
  // If cache key differs from current file props, old cache won't match
  // We simply enqueue if missing thumbnail or different computed key than when it was cached
  const targets = (files || []).filter((f) => !getCachedThumbnail(f));
  enqueueThumbnailJobs(targets);
}



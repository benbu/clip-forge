import { useMediaStore } from '@/store/mediaStore';
import { enqueueThumbnailJobs } from '@/services/thumbnailService';

/**
 * Check if a path is an absolute path (not just a filename)
 * @param {string} filePath - Path to check
 * @returns {boolean} True if path is absolute
 */
function isAbsolutePath(filePath) {
  if (!filePath || typeof filePath !== 'string') return false;
  
  // Windows absolute path: C:\ or \\server\share
  if (/^[a-zA-Z]:\\/.test(filePath) || filePath.startsWith('\\\\')) return true;
  
  // POSIX absolute path: /path
  if (filePath.startsWith('/')) return true;
  
  return false;
}

export async function checkMissingMedia(files) {
  if (!Array.isArray(files) || files.length === 0) return;
  const api = window.electronAPI;
  if (!api?.fileExists) return;
  const { updateFile } = useMediaStore.getState();
  for (const f of files) {
    // Skip files without paths
    if (!f?.path) continue;
    
    // Skip files with originalFile reference - these are blob-backed and always available
    // They don't need missing checks since they're in memory
    if (f.originalFile) continue;
    
    // Only check files with absolute paths - skip relative paths/filenames
    // Files without absolute paths can't be verified via filesystem checks
    if (!isAbsolutePath(f.path)) continue;
    
    try {
      const res = await api.fileExists(f.path);
      if (!res?.exists) {
        updateFile(f.id, { missing: true });
      } else if (f.missing) {
        updateFile(f.id, { missing: false });
      }
    } catch (_) {
      // ignore
    }
  }
}

function toFileUrl(p) {
  if (!p) return '';
  let norm = String(p).replace(/\\/g, '/');
  if (!norm.startsWith('/')) norm = '/' + norm;
  return `file://${norm}`;
}

export function probeMetadataFromPath(filePath, timeOffset = 1) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    let timeoutId = null;
    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId);
      video.src = '';
      video.removeAttribute('src');
      video.load();
    };
    timeoutId = setTimeout(() => {
      cleanup();
      resolve({ duration: 0, width: 1920, height: 1080, thumbnail: null });
    }, 8000);
    video.onloadedmetadata = () => {
      try {
        const width = video.videoWidth || 1920;
        const height = video.videoHeight || 1080;
        const duration = video.duration || 0;
        // Try capture frame
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        video.currentTime = Math.min(timeOffset, Math.max(0, duration * 0.1));
        video.onseeked = () => {
          try {
            ctx.drawImage(video, 0, 0, width, height);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            cleanup();
            resolve({ duration, width, height, thumbnail });
          } catch (_) {
            cleanup();
            resolve({ duration, width, height, thumbnail: null });
          }
        };
      } catch (_) {
        cleanup();
        resolve({ duration: 0, width: 1920, height: 1080, thumbnail: null });
      }
    };
    video.onerror = () => {
      cleanup();
      resolve({ duration: 0, width: 1920, height: 1080, thumbnail: null });
    };
    try {
      video.src = toFileUrl(filePath);
    } catch (_) {
      cleanup();
      resolve({ duration: 0, width: 1920, height: 1080, thumbnail: null });
    }
  });
}

export async function relinkFile(fileId) {
  const api = window.electronAPI;
  if (!api?.openVideoDialog) return null;
  const { files, updateFile } = useMediaStore.getState();
  const file = files.find((f) => f.id === fileId);
  if (!file) return null;
  const newPath = await api.openVideoDialog();
  if (!newPath) return null;
  // Probe metadata and thumbnail from path
  const meta = await probeMetadataFromPath(newPath);
  const updates = {
    path: newPath,
    missing: false,
    size: file.size, // keep human-readable size (unknown here)
    sizeBytes: file.sizeBytes, // unchanged unless we add stat
    duration: meta.duration ? formatDuration(meta.duration) : file.duration,
    durationSeconds: meta.duration || file.durationSeconds,
    width: meta.width || file.width,
    height: meta.height || file.height,
    resolution: `${meta.width || file.width}x${meta.height || file.height}`,
    thumbnail: meta.thumbnail || file.thumbnail,
  };
  updateFile(fileId, updates);
  // Queue thumbnail regeneration if still missing
  if (!updates.thumbnail) enqueueThumbnailJobs([files.find((f) => f.id === fileId)]);
  return newPath;
}

function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}



/**
 * Video Service - High-level video operations using FFmpeg
 */

let ffmpegWorker = null;

/**
 * Initialize FFmpeg worker
 */
export async function initVideoService() {
  if (ffmpegWorker) {
    return { success: true, module: ffmpegWorker };
  }

  try {
    // Import FFmpeg worker functions
    const ffmpegModule = await import('../../media/ffmpegWorker.js');
    ffmpegWorker = ffmpegModule;
    
    // Initialize FFmpeg
    await ffmpegModule.initFFmpeg();
    
    return { success: true, module: ffmpegWorker };
  } catch (error) {
    console.error('Failed to initialize video service:', error);
    try { await window?.electronAPI?.logMessage?.({ level: 'error', scope: 'ffmpeg', message: 'init video service failed', stack: error?.stack || String(error) }); } catch(_) {}
    return { success: false, error };
  }
}

async function ensureInitialized() {
  if (ffmpegWorker) return ffmpegWorker;
  const result = await initVideoService();
  if (result?.success) return ffmpegWorker;
  const err =
    result?.error || new Error('Video service not initialized');
  throw err;
}

/**
 * Trim video clip
 */
export async function trimClip(filePath, startTime, endTime) {
  await ensureInitialized();
  
  try {
    const outputData = await ffmpegWorker.trimVideo(
      filePath,
      startTime,
      endTime,
      'trimmed.mp4'
    );
    
    return outputData;
  } catch (error) {
    console.error('Failed to trim video:', error);
    try { await window?.electronAPI?.logMessage?.({ level: 'error', scope: 'ffmpeg', message: 'trim clip failed', stack: error?.stack || String(error) }); } catch(_) {}
    throw error;
  }
}

/**
 * Concatenate multiple clips
 */
export async function mergeClips(clips) {
  await ensureInitialized();
  
  try {
    const outputData = await ffmpegWorker.concatenateClips(clips, 'merged.mp4');
    
    return outputData;
  } catch (error) {
    console.error('Failed to merge clips:', error);
    try { await window?.electronAPI?.logMessage?.({ level: 'error', scope: 'ffmpeg', message: 'merge clips failed', stack: error?.stack || String(error) }); } catch(_) {}
    throw error;
  }
}

/**
 * Export video with specific settings
 */
export async function exportVideo(filePath, options = {}) {
  await ensureInitialized();
  
  try {
    const outputData = await ffmpegWorker.exportVideo(filePath, 'exported.mp4', {
      resolution: options.resolution || '1920x1080',
      fps: options.fps ?? 60,
      bitrate: options.bitrate || '8000k',
      codec: options.codec || 'libx264',
      crf: options.crf || '23',
    });
    
    return outputData;
  } catch (error) {
    console.error('Failed to export video:', error);
    try { await window?.electronAPI?.logMessage?.({ level: 'error', scope: 'ffmpeg', message: 'export video failed', stack: error?.stack || String(error) }); } catch(_) {}
    throw error;
  }
}

/**
 * Generate thumbnail for video
 */
export async function generateThumbnail(filePath, time = 1) {
  await ensureInitialized();
  
  try {
    const thumbnailData = await ffmpegWorker.extractThumbnail(filePath, time);
    
    // Convert to base64 data URL
    const blob = new Blob([thumbnailData], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    try { await window?.electronAPI?.logMessage?.({ level: 'error', scope: 'ffmpeg', message: 'generate thumbnail failed', stack: error?.stack || String(error) }); } catch(_) {}
    throw error;
  }
}

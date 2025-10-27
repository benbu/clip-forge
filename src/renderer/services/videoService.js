/**
 * Video Service - High-level video operations using FFmpeg
 */

let ffmpegWorker = null;

/**
 * Initialize FFmpeg worker
 */
export async function initVideoService() {
  try {
    // Import FFmpeg worker functions
    const ffmpegModule = await import('../../media/ffmpegWorker.js');
    ffmpegWorker = ffmpegModule;
    
    // Initialize FFmpeg
    await ffmpegModule.initFFmpeg();
    
    return true;
  } catch (error) {
    console.error('Failed to initialize video service:', error);
    return false;
  }
}

/**
 * Trim video clip
 */
export async function trimClip(filePath, startTime, endTime) {
  if (!ffmpegWorker) {
    throw new Error('Video service not initialized');
  }
  
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
    throw error;
  }
}

/**
 * Concatenate multiple clips
 */
export async function mergeClips(clips) {
  if (!ffmpegWorker) {
    throw new Error('Video service not initialized');
  }
  
  try {
    const outputData = await ffmpegWorker.concatenateClips(clips, 'merged.mp4');
    
    return outputData;
  } catch (error) {
    console.error('Failed to merge clips:', error);
    throw error;
  }
}

/**
 * Export video with specific settings
 */
export async function exportVideo(filePath, options = {}) {
  if (!ffmpegWorker) {
    throw new Error('Video service not initialized');
  }
  
  try {
    const outputData = await ffmpegWorker.exportVideo(filePath, 'exported.mp4', {
      resolution: options.resolution || '1920x1080',
      bitrate: options.bitrate || '8000k',
      codec: options.codec || 'libx264',
      crf: options.crf || '23',
    });
    
    return outputData;
  } catch (error) {
    console.error('Failed to export video:', error);
    throw error;
  }
}

/**
 * Generate thumbnail for video
 */
export async function generateThumbnail(filePath, time = 1) {
  if (!ffmpegWorker) {
    throw new Error('Video service not initialized');
  }
  
  try {
    const thumbnailData = await ffmpegWorker.extractThumbnail(filePath, time);
    
    // Convert to base64 data URL
    const blob = new Blob([thumbnailData], { type: 'image/png' });
    const url = URL.createObjectURL(blob);
    
    return url;
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    throw error;
  }
}


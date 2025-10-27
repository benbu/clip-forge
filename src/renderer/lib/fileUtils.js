/**
 * File Utilities - Helper functions for file handling and metadata
 */

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Format duration to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Extract video metadata from HTML5 video element
 */
export async function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
    
    video.onerror = (e) => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };
    
    video.src = URL.createObjectURL(file);
  });
}

/**
 * Create file object from File or path
 */
export function createFileObject(file, metadata = {}) {
  const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id,
    name: file.name,
    path: file.path || file.name,
    size: file.size || metadata.size || 0,
    type: file.type || 'video/mp4',
    duration: metadata.duration || 0,
    width: metadata.width || 1920,
    height: metadata.height || 1080,
    thumbnail: null, // Will be generated later
    createdAt: new Date().toISOString(),
  };
}


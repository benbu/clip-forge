/**
 * Media Service - Handles file import and metadata extraction
 */

/**
 * Import video files and extract metadata
 * @param {File[]} files - Array of File objects
 * @returns {Promise<Array>} Array of file objects with metadata
 */
export async function importVideoFiles(files, options = {}) {
  const importedFiles = [];
  const { enrichFile } = options || {};
  
  for (const file of files) {
    try {
      // Extract metadata using HTML5 video element
      const metadata = await extractVideoMetadata(file);
      
      // Create file object
      const fileObj = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        path: file.path || file.name,
        size: formatFileSize(file.size),
        sizeBytes: file.size, // Keep original for future reference
        type: file.type,
        duration: formatDuration(metadata.duration),
        durationSeconds: metadata.duration, // Keep original for timeline calculations
        width: metadata.width,
        height: metadata.height,
        resolution: `${metadata.width}x${metadata.height}`,
        originalFile: file, // Keep reference to File object for blob URL creation
        createdAt: new Date().toISOString(),
      };

      if (typeof enrichFile === 'function') {
        try {
          const extras = await enrichFile({ file, metadata, base: fileObj });
          if (extras && typeof extras === 'object') {
            Object.assign(fileObj, extras);
          }
        } catch (extraError) {
          console.warn(`Failed to enrich metadata for ${file.name}:`, extraError);
        }
      }
      
      importedFiles.push(fileObj);
    } catch (error) {
      console.error(`Failed to import ${file.name}:`, error);
    }
  }
  
  return importedFiles;
}

/**
 * Extract video metadata from HTML5 video element
 */
function extractVideoMetadata(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true; // Mute to avoid autoplay issues
    
    let blobUrl = null;
    
    const cleanup = () => {
      if (blobUrl) {
        window.URL.revokeObjectURL(blobUrl);
        blobUrl = null;
      }
    };
    
    // Set timeout to prevent hanging
    const timeout = setTimeout(() => {
      cleanup();
      resolve({
        duration: 0,
        width: 1920,
        height: 1080,
      });
    }, 5000);
    
    video.onloadedmetadata = () => {
      clearTimeout(timeout);
      const metadata = {
        duration: video.duration || 0,
        width: video.videoWidth || 1920,
        height: video.videoHeight || 1080,
      };
      
      cleanup();
      resolve(metadata);
    };
    
    video.onerror = (e) => {
      clearTimeout(timeout);
      console.warn('Failed to load video metadata, using fallback values:', e);
      cleanup();
      
      // Provide fallback metadata instead of rejecting
      resolve({
        duration: 0,
        width: 1920,
        height: 1080,
      });
    };
    
    try {
      blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;
    } catch (error) {
      clearTimeout(timeout);
      cleanup();
      console.warn('Error creating blob URL, using fallback values:', error);
      resolve({
        duration: 0,
        width: 1920,
        height: 1080,
      });
    }
  });
}

/**
 * Format file size in bytes to human readable format
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS format
 */
function formatDuration(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}

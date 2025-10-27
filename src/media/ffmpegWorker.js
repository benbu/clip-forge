/**
 * FFmpeg Worker Thread
 * Handles video processing in a separate worker thread to avoid blocking the main UI
 */

import { createFFmpeg, fetchFile } from '@ffmpeg/ffmpeg';

let ffmpeg = null;

/**
 * Initialize FFmpeg instance
 */
export async function initFFmpeg() {
  if (ffmpeg) return ffmpeg;
  
  ffmpeg = createFFmpeg({
    log: true,
    progress: (progress) => {
      self.postMessage({
        type: 'progress',
        progress: progress.ratio
      });
    }
  });
  
  await ffmpeg.load();
  return ffmpeg;
}

/**
 * Trim video to specified in/out points
 * @param {string} inputPath - Path to input video file
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {string} outputPath - Path to output file
 * @returns {Promise<Uint8Array>} Output video data
 */
export async function trimVideo(inputPath, startTime, endTime, outputPath) {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    // Read input file
    const data = await fetchFile(inputPath);
    ffmpegInstance.FS('writeFile', 'input.mp4', data);
    
    // Calculate duration
    const duration = endTime - startTime;
    
    // Execute trim command
    await ffmpegInstance.run(
      '-i', 'input.mp4',
      '-ss', startTime.toString(),
      '-t', duration.toString(),
      '-c', 'copy', // Copy stream (fast, no re-encoding)
      'output.mp4'
    );
    
    // Read output file
    const outputData = ffmpegInstance.FS('readFile', 'output.mp4');
    
    // Clean up
    ffmpegInstance.FS('unlink', 'input.mp4');
    ffmpegInstance.FS('unlink', 'output.mp4');
    
    return outputData;
  } catch (error) {
    console.error('Error trimming video:', error);
    throw error;
  }
}

/**
 * Concatenate multiple video clips
 * @param {Array<{path: string, start?: number, end?: number}>} clips - Array of clip info
 * @param {string} outputPath - Path to output file
 * @returns {Promise<Uint8Array>} Output video data
 */
export async function concatenateClips(clips, outputPath) {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    // Write input files
    for (let i = 0; i < clips.length; i++) {
      const data = await fetchFile(clips[i].path);
      ffmpegInstance.FS('writeFile', `input_${i}.mp4`, data);
    }
    
    // Create concat file
    const concatContent = clips.map((_, i) => `file 'input_${i}.mp4'`).join('\n');
    ffmpegInstance.FS('writeFile', 'concat.txt', concatContent);
    
    // Execute concat command
    await ffmpegInstance.run(
      '-f', 'concat',
      '-safe', '0',
      '-i', 'concat.txt',
      '-c', 'copy',
      'output.mp4'
    );
    
    // Read output file
    const outputData = ffmpegInstance.FS('readFile', 'output.mp4');
    
    // Clean up
    clips.forEach((_, i) => ffmpegInstance.FS('unlink', `input_${i}.mp4`));
    ffmpegInstance.FS('unlink', 'concat.txt');
    ffmpegInstance.FS('unlink', 'output.mp4');
    
    return outputData;
  } catch (error) {
    console.error('Error concatenating clips:', error);
    throw error;
  }
}

/**
 * Export video to specific resolution and format
 * @param {string} inputPath - Path to input video file
 * @param {string} outputPath - Path to output file
 * @param {Object} options - Export options (resolution, codec, etc.)
 * @returns {Promise<Uint8Array>} Output video data
 */
export async function exportVideo(inputPath, outputPath, options = {}) {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    // Read input file
    const data = await fetchFile(inputPath);
    ffmpegInstance.FS('writeFile', 'input.mp4', data);
    
    // Build FFmpeg command
    const cmd = ['-i', 'input.mp4'];
    
    // Add resolution if specified
    if (options.resolution) {
      cmd.push('-vf', `scale=${options.resolution}`);
    }
    
    // Add bitrate if specified
    if (options.bitrate) {
      cmd.push('-b:v', options.bitrate);
    }
    
    // Add codec
    cmd.push('-c:v', options.codec || 'libx264');
    cmd.push('-c:a', 'aac');
    
    // Add preset for faster encoding
    cmd.push('-preset', 'fast');
    cmd.push('-crf', options.crf || '23'); // Quality (lower = better, 18-28 is good range)
    
    cmd.push('output.mp4');
    
    // Execute command
    await ffmpegInstance.run(...cmd);
    
    // Read output file
    const outputData = ffmpegInstance.FS('readFile', 'output.mp4');
    
    // Clean up
    ffmpegInstance.FS('unlink', 'input.mp4');
    ffmpegInstance.FS('unlink', 'output.mp4');
    
    return outputData;
  } catch (error) {
    console.error('Error exporting video:', error);
    throw error;
  }
}

/**
 * Extract video frame as thumbnail
 * @param {string} inputPath - Path to input video file
 * @param {number} time - Time in seconds to extract frame
 * @returns {Promise<Uint8Array>} Image data (PNG)
 */
export async function extractThumbnail(inputPath, time) {
  const ffmpegInstance = await initFFmpeg();
  
  try {
    // Read input file
    const data = await fetchFile(inputPath);
    ffmpegInstance.FS('writeFile', 'input.mp4', data);
    
    // Extract frame
    await ffmpegInstance.run(
      '-i', 'input.mp4',
      '-ss', time.toString(),
      '-vframes', '1',
      '-vf', 'scale=320:-1', // Scale to 320px width
      'thumbnail.png'
    );
    
    // Read thumbnail
    const thumbnailData = ffmpegInstance.FS('readFile', 'thumbnail.png');
    
    // Clean up
    ffmpegInstance.FS('unlink', 'input.mp4');
    ffmpegInstance.FS('unlink', 'thumbnail.png');
    
    return thumbnailData;
  } catch (error) {
    console.error('Error extracting thumbnail:', error);
    throw error;
  }
}


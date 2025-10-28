/**
 * FFmpeg Utility Module
 * Handles video processing in a dedicated FFmpeg instance so UI remains responsive.
 *
 * This module targets the modern @ffmpeg/ffmpeg >= 0.12 APIs which expose the `FFmpeg`
 * class instead of the legacy `createFFmpeg` helper.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import coreScriptURL from '@ffmpeg/core?url';
import coreWasmURL from '@ffmpeg/core/wasm?url';
import coreWorkerURL from '@ffmpeg/ffmpeg/worker?url';

let ffmpeg;
let loadPromise;

async function getFFmpeg() {
  if (ffmpeg?.loaded) return ffmpeg;

  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ type, message }) => {
      if (import.meta.env?.DEV) {
        console.debug(`[ffmpeg:${type}] ${message}`);
      }
    });
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      await ffmpeg.load({
        coreURL: coreScriptURL,
        wasmURL: coreWasmURL,
        workerURL: coreWorkerURL,
      });

      ffmpeg.on('progress', ({ progress }) => {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('ffmpeg-progress', { detail: { progress } })
          );
        }
      });

      return ffmpeg;
    })()
      .then(() => ffmpeg)
      .catch((error) => {
        ffmpeg = undefined;
        loadPromise = undefined;
        throw error;
      });
  }

  await loadPromise;
  return ffmpeg;
}

async function writeInputFile(instance, name, source) {
  if (!source) {
    throw new Error(`Missing media source for ${name}`);
  }

  const data = await fetchFile(source);
  if (!data || data.length === 0) {
    throw new Error(`Unable to load media data for ${name}`);
  }

  await instance.writeFile(name, data);
  return name;
}

async function safeDelete(instance, path) {
  try {
    await instance.deleteFile(path);
  } catch {
    // ignore cleanup failures
  }
}

async function runCommand(instance, args) {
  const resultCode = await instance.exec(args);
  if (resultCode !== 0) {
    throw new Error(`FFmpeg exited with code ${resultCode} (${args.join(' ')})`);
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sanitizeOverlay = (overlay, defaults = {}) => {
  if (!overlay || typeof overlay !== 'object') {
    return { ...defaults };
  }
  const position = overlay.position || defaults.position || 'top-right';
  const size = clamp(
    Number.isFinite(overlay.size) ? overlay.size : defaults.size ?? 0.22,
    0.1,
    0.6
  );
  const borderRadius =
    Number.isFinite(overlay.borderRadius) ? overlay.borderRadius : defaults.borderRadius ?? 12;
  return { position, size, borderRadius };
};

const normalizeOverlayKeyframes = (keyframes, duration, defaults = {}) => {
  const sanitizedDefaults = sanitizeOverlay(defaults);
  const frames = Array.isArray(keyframes)
    ? keyframes
        .map((frame) => {
          if (!frame) return null;
          const timestamp = Number(frame.timestamp);
          if (!Number.isFinite(timestamp)) return null;
          return {
            timestamp: Math.max(0, timestamp),
            overlay: sanitizeOverlay(frame.overlay, sanitizedDefaults),
          };
        })
        .filter(Boolean)
    : [];

  if (frames.length === 0) {
    frames.push({
      timestamp: 0,
      overlay: { ...sanitizedDefaults },
    });
  }

  frames.sort((a, b) => a.timestamp - b.timestamp);

  if (frames[0].timestamp > 0) {
    frames.unshift({
      timestamp: 0,
      overlay: { ...frames[0].overlay },
    });
  }

  const totalDuration = Number(duration);
  const clipDuration = Number.isFinite(totalDuration) ? Math.max(totalDuration, 0) : null;

  return frames.map((frame, index) => {
    const next = frames[index + 1];
    const end =
      next?.timestamp != null
        ? Math.max(frame.timestamp, next.timestamp)
        : clipDuration != null
          ? Math.max(frame.timestamp, clipDuration)
          : frame.timestamp + 60; // Fallback duration when unknown
    return {
      start: frame.timestamp,
      end,
      overlay: frame.overlay,
    };
  });
};

const computeOverlayPosition = (
  position,
  overlayWidth,
  overlayHeight,
  videoWidth,
  videoHeight,
  margin = 24
) => {
  const safeMargin = Number.isFinite(margin) ? margin : 24;
  const maxX = Math.max(0, videoWidth - overlayWidth - safeMargin);
  const maxY = Math.max(0, videoHeight - overlayHeight - safeMargin);

  switch (position) {
    case 'top-left':
      return { x: safeMargin, y: safeMargin };
    case 'bottom-left':
      return { x: safeMargin, y: maxY };
    case 'bottom-right':
      return { x: maxX, y: maxY };
    case 'center':
      return {
        x: Math.max(0, Math.round((videoWidth - overlayWidth) / 2)),
        y: Math.max(0, Math.round((videoHeight - overlayHeight) / 2)),
      };
    case 'top-right':
    default:
      return { x: maxX, y: safeMargin };
  }
};

async function transcodeClip(instance, inputName, outputName) {
  await runCommand(instance, [
    '-i',
    inputName,
    '-c:v',
    'libx264',
    '-preset',
    'fast',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    '-movflags',
    'faststart',
    outputName,
  ]);
  return outputName;
}

async function composeClipWithOverlay(instance, context) {
  const {
    clip,
    index,
    baseInputName,
    cameraInputName,
  } = context;

  const normalized = normalizeOverlayKeyframes(
    clip.overlayKeyframes,
    clip.duration,
    clip.overlayDefaults
  ).filter((segment) => segment.end > segment.start + 0.01);

  if (normalized.length === 0) {
    const fallbackName = `prepared_clip_${index}.mp4`;
    await transcodeClip(instance, baseInputName, fallbackName);
    return fallbackName;
  }

  const baseWidth = clamp(
    Number(clip.screenResolution?.width) || Number(clip.width) || 1920,
    320,
    7680
  );
  const baseHeight = clamp(
    Number(clip.screenResolution?.height) || Number(clip.height) || 1080,
    240,
    4320
  );

  const cameraWidth = Number(clip.cameraResolution?.width) || 1280;
  const cameraHeight = Number(clip.cameraResolution?.height) || 720;
  const cameraAspect = clamp(cameraWidth / cameraHeight || 16 / 9, 0.5, 3);

  const overlayMargin = Number(clip.overlayMargin);

  const segmentOutputs = [];

  for (let i = 0; i < normalized.length; i += 1) {
    const segment = normalized[i];
    const start = Math.max(0, segment.start);
    const end = Math.max(start, segment.end);
    if (end - start < 0.05) {
      continue;
    }

    const overlay = segment.overlay || {};
    const overlaySize = clamp(overlay.size ?? 0.22, 0.1, 0.6);
    const marginValue = Number.isFinite(overlayMargin) ? overlayMargin : 24;
    const overlayWidthRaw = Math.round(baseWidth * overlaySize);
    const maxOverlayWidth = Math.max(160, baseWidth - marginValue * 2);
    const maxOverlayHeight = Math.max(90, baseHeight - marginValue * 2);

    let drawnWidth = clamp(overlayWidthRaw, 80, maxOverlayWidth);
    let drawnHeight = Math.round(drawnWidth / cameraAspect);

    if (drawnHeight > maxOverlayHeight) {
      drawnHeight = maxOverlayHeight;
      drawnWidth = Math.round(drawnHeight * cameraAspect);
    }

    drawnWidth = clamp(drawnWidth, 80, maxOverlayWidth);
    drawnHeight = clamp(drawnHeight, 80, maxOverlayHeight);

    const { x, y } = computeOverlayPosition(
      overlay.position || 'top-right',
      drawnWidth,
      drawnHeight,
      baseWidth,
      baseHeight,
      marginValue
    );

    const outputName = `overlay_segment_${index}_${i}.mp4`;

    const filter = [
      `[1:v]scale=${drawnWidth}:${drawnHeight}[cam]`,
      `[0:v][cam]overlay=x=${x}:y=${y}:shortest=1[vout]`,
    ].join(';');

    await runCommand(instance, [
      '-ss',
      start.toFixed(3),
      '-to',
      end.toFixed(3),
      '-i',
      baseInputName,
      '-ss',
      start.toFixed(3),
      '-to',
      end.toFixed(3),
      '-i',
      cameraInputName,
      '-filter_complex',
      filter,
      '-map',
      '[vout]',
      '-map',
      '0:a?',
      '-c:v',
      'libx264',
      '-preset',
      'fast',
      '-crf',
      '18',
      '-pix_fmt',
      'yuv420p',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-shortest',
      '-movflags',
      'faststart',
      outputName,
    ]);

    segmentOutputs.push(outputName);
  }

  if (segmentOutputs.length === 0) {
    const fallbackName = `prepared_clip_${index}.mp4`;
    await transcodeClip(instance, baseInputName, fallbackName);
    return fallbackName;
  }

  if (segmentOutputs.length === 1) {
    return segmentOutputs[0];
  }

  const listName = `overlay_concat_${index}.txt`;
  const listContent = segmentOutputs.map((name) => `file '${name}'`).join('\n');
  await instance.writeFile(listName, listContent);

  const compositeName = `overlay_prepared_${index}.mp4`;
  await runCommand(instance, [
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    listName,
    '-c',
    'copy',
    compositeName,
  ]);

  await safeDelete(instance, listName);
  for (const name of segmentOutputs) {
    await safeDelete(instance, name);
  }

  return compositeName;
}

async function prepareClip(instance, clip, index) {
  const baseInputName = `clip_base_${index}.dat`;
  await writeInputFile(instance, baseInputName, clip.source ?? clip.path);

  const hasOverlaySource = Boolean(clip.overlaySource);

  if (!hasOverlaySource) {
    const preparedName = `prepared_clip_${index}.mp4`;
    await transcodeClip(instance, baseInputName, preparedName);
    await safeDelete(instance, baseInputName);
    return preparedName;
  }

  const cameraInputName = `clip_camera_${index}.dat`;
  await writeInputFile(instance, cameraInputName, clip.overlaySource);

  try {
    const prepared = await composeClipWithOverlay(instance, {
      clip,
      index,
      baseInputName,
      cameraInputName,
    });
    await safeDelete(instance, baseInputName);
    await safeDelete(instance, cameraInputName);
    return prepared;
  } catch (error) {
    await safeDelete(instance, cameraInputName);
    await safeDelete(instance, baseInputName);
    throw error;
  }
}

/**
 * Public API
 */
export async function initFFmpeg() {
  await getFFmpeg();
  return ffmpeg;
}

export async function trimVideo(source, startTime, endTime, outputName = 'output.mp4') {
  const instance = await getFFmpeg();
  const inputName = 'trim-input.mp4';
  const outputFile = outputName || 'output.mp4';

  try {
    await writeInputFile(instance, inputName, source);

    const duration = Math.max(0, endTime - startTime);
    await runCommand(instance, [
      '-i',
      inputName,
      '-ss',
      startTime.toString(),
      '-t',
      duration.toString(),
      '-c',
      'copy',
      outputFile,
    ]);

    return await instance.readFile(outputFile);
  } catch (error) {
    console.error('Error trimming video:', error);
    throw error;
  } finally {
    await safeDelete(instance, inputName);
    await safeDelete(instance, outputFile);
  }
}

export async function concatenateClips(clips, outputName = 'output.mp4') {
  const instance = await getFFmpeg();
  const outputFile = outputName;
  const preparedClips = [];
  const concatListName = 'concat.txt';

  try {
    for (let i = 0; i < clips.length; i += 1) {
      const prepared = await prepareClip(instance, clips[i], i);
      preparedClips.push(prepared);
    }

    const concatContent = preparedClips.map((name) => `file '${name}'`).join('\n');
    await instance.writeFile(concatListName, concatContent);

    await runCommand(instance, [
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListName,
      '-c',
      'copy',
      outputFile,
    ]);

    return await instance.readFile(outputFile);
  } catch (error) {
    console.error('Error concatenating clips:', error);
    throw error;
  } finally {
    for (const name of preparedClips) {
      await safeDelete(instance, name);
    }
    await safeDelete(instance, concatListName);
    await safeDelete(instance, outputFile);
  }
}

export async function exportVideo(source, outputName = 'exported.mp4', options = {}) {
  const instance = await getFFmpeg();
  const inputName = 'export-input.mp4';
  const outputFile = outputName || 'exported.mp4';

  try {
    await writeInputFile(instance, inputName, source);

    const command = ['-i', inputName];

    if (options.resolution) {
      command.push('-vf', `scale=${options.resolution}`);
    }

    if (options.bitrate) {
      command.push('-b:v', options.bitrate);
    }

    command.push('-c:v', options.codec || 'libx264', '-c:a', 'aac', '-preset', 'fast');

    if (options.crf) {
      command.push('-crf', `${options.crf}`);
    } else {
      command.push('-crf', '23');
    }

    command.push(outputFile);

    await runCommand(instance, command);

    return await instance.readFile(outputFile);
  } catch (error) {
    console.error('Error exporting video:', error);
    throw error;
  } finally {
    await safeDelete(instance, inputName);
    await safeDelete(instance, outputFile);
  }
}

export async function extractThumbnail(source, time = 1, outputName = 'thumbnail.png') {
  const instance = await getFFmpeg();
  const inputName = 'thumb-input.mp4';
  const outputFile = outputName;

  try {
    await writeInputFile(instance, inputName, source);

    await runCommand(instance, [
      '-i',
      inputName,
      '-ss',
      time.toString(),
      '-vframes',
      '1',
      '-vf',
      'scale=320:-1',
      outputFile,
    ]);

    return await instance.readFile(outputFile);
  } catch (error) {
    console.error('Error extracting thumbnail:', error);
    throw error;
  } finally {
    await safeDelete(instance, inputName);
    await safeDelete(instance, outputFile);
  }
}

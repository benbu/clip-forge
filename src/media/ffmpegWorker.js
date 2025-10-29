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

const hasPerformanceNow =
  typeof performance !== 'undefined' && typeof performance.now === 'function';

const now = () => (hasPerformanceNow ? performance.now() : Date.now());

const shouldLogMetrics = () => {
  if (typeof process !== 'undefined' && process?.env?.CLIPFORGE_EXPORT_METRICS === '1') {
    return true;
  }

  if (typeof window !== 'undefined' && window?.__CLIPFORGE_EXPORT_METRICS__ === true) {
    return true;
  }

  if (typeof import.meta !== 'undefined') {
    const env = import.meta?.env;
    if (env) {
      if (env.VITE_EXPORT_METRICS === 'true') {
        return true;
      }
      if (env.MODE === 'development' && env.VITE_EXPORT_METRICS !== 'false') {
        return true;
      }
    }
  }

  return false;
};

const emitMetric = (name, detail) => {
  if (!shouldLogMetrics()) {
    return;
  }

  if (typeof console !== 'undefined' && typeof console.info === 'function') {
    console.info(`[metrics:${name}]`, detail);
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.dispatchEvent === 'function' &&
    typeof CustomEvent === 'function'
  ) {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {
      // Ignore CustomEvent dispatch failures (e.g. non-browser env)
    }
  }
};

const snapshotOptions = (options = {}) => ({
  resolution: options.resolution ?? null,
  fps: options.fps ?? null,
  bitrate: options.bitrate ?? null,
  codec: options.codec ?? null,
  crf: options.crf ?? null,
  preset: options.preset ?? null,
  format: options.format ?? null,
});

const canCopyExport = (options = {}) => {
  if (!options || typeof options !== 'object') {
    return true;
  }

  if (options.forceEncode) {
    return false;
  }

  if (options.resolution) {
    return false;
  }

  if (options.fps != null) {
    return false;
  }

  if (options.bitrate) {
    return false;
  }

  if (options.crf != null && Number(options.crf) !== 23) {
    return false;
  }

  if (options.preset && options.preset !== 'veryfast') {
    return false;
  }

  if (options.format && String(options.format).toLowerCase() !== 'mp4') {
    return false;
  }

  if (options.codec && !['copy', 'libx264'].includes(options.codec)) {
    return false;
  }

  return true;
};

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

  // Fast-path: typed array or ArrayBuffer provided
  if (source instanceof Uint8Array) {
    if (source.length === 0) throw new Error(`Unable to load media data for ${name}`);
    await instance.writeFile(name, source);
    return name;
  }
  if (source instanceof ArrayBuffer) {
    const bytes = new Uint8Array(source);
    if (bytes.length === 0) throw new Error(`Unable to load media data for ${name}`);
    await instance.writeFile(name, bytes);
    return name;
  }

  const isAbsolutePath = (value) => {
    if (typeof value !== 'string') return false;
    if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('blob:')) {
      return false;
    }
    // Windows absolute (C:\ or \\server\share)
    if (/^[a-zA-Z]:\\/.test(value) || value.startsWith('\\\\')) return true;
    // POSIX absolute (/path)
    if (value.startsWith('/')) return true;
    return false;
  };

  let data;

  // Prefer IPC read for absolute filesystem paths (renderer cannot fetch these)
  if (isAbsolutePath(source) && typeof window !== 'undefined' && window.electronAPI?.readFile) {
    try {
      const bytes = await window.electronAPI.readFile(source);
      data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    } catch (err) {
      // Fall back to fetchFile to surface a meaningful error if applicable
      try {
        data = await fetchFile(source);
      } catch (_) {
        throw err;
      }
    }
  } else {
    data = await fetchFile(source);
  }

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
  const logs = [];
  const listener = ({ type, message }) => {
    logs.push(`[${type}] ${message}`);
  };
  instance.on('log', listener);
  const metricsActive = shouldLogMetrics();
  const start = metricsActive ? now() : 0;
  try {
    const resultCode = await instance.exec(args);
    if (resultCode !== 0) {
      const logTail = logs.slice(-30).join('\n');
      console.error('FFmpeg command failed', args.join(' '), '\nLogs:\n', logTail);
      const error = new Error(`FFmpeg exited with code ${resultCode} (${args.join(' ')})`);
      error.logs = logTail;
      throw error;
    }
  } finally {
    if (typeof instance.off === 'function') {
      instance.off('log', listener);
    }
    if (metricsActive) {
      const durationMs = Math.max(0, now() - start);
      emitMetric('ffmpeg:command', {
        args,
        durationMs,
        timestamp: Date.now(),
      });
    }
  }
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const sanitizeCoordinates = (coords, fallback = null) => {
  if (!coords || typeof coords !== 'object') return fallback;
  const xPercent = Number.isFinite(coords.xPercent) ? clamp(coords.xPercent, 0, 1) : null;
  const yPercent = Number.isFinite(coords.yPercent) ? clamp(coords.yPercent, 0, 1) : null;
  if (xPercent === null || yPercent === null) return fallback;
  return { xPercent, yPercent };
};

const sanitizeOverlay = (overlay, defaults = {}) => {
  const base = defaults || {};
  if (!overlay || typeof overlay !== 'object') {
    return {
      position: base.position || 'top-right',
      size: clamp(base.size ?? 0.22, 0.1, 0.6),
      borderRadius: clamp(base.borderRadius ?? 12, 0, 64),
      coordinates:
        base.position === 'custom'
          ? sanitizeCoordinates(base.coordinates, { xPercent: 0.5, yPercent: 0.5 })
          : null,
    };
  }

  const positionRaw = overlay.position || base.position || 'top-right';
  const allowedPositions = ['top-right', 'top-left', 'bottom-right', 'bottom-left', 'center', 'custom'];
  const position = allowedPositions.includes(positionRaw) ? positionRaw : 'top-right';
  const size = clamp(
    Number.isFinite(overlay.size) ? overlay.size : base.size ?? 0.22,
    0.1,
    0.6
  );
  const borderRadius = clamp(
    Number.isFinite(overlay.borderRadius) ? overlay.borderRadius : base.borderRadius ?? 12,
    0,
    64
  );
  const coordinates =
    position === 'custom'
      ? sanitizeCoordinates(overlay.coordinates, sanitizeCoordinates(base.coordinates, { xPercent: 0.5, yPercent: 0.5 }))
      : null;

  return { position, size, borderRadius, coordinates };
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
  overlay,
  overlayWidth,
  overlayHeight,
  videoWidth,
  videoHeight,
  margin = 24
) => {
  const safeMargin = Number.isFinite(margin) ? margin : 24;
  const safeWidth = Math.max(0, videoWidth - overlayWidth - safeMargin * 2);
  const safeHeight = Math.max(0, videoHeight - overlayHeight - safeMargin * 2);

  if (overlay?.position === 'custom' && overlay.coordinates) {
    const xPercent = clamp(overlay.coordinates.xPercent ?? 0.5, 0, 1);
    const yPercent = clamp(overlay.coordinates.yPercent ?? 0.5, 0, 1);
    const x = safeWidth > 0 ? safeMargin + xPercent * safeWidth : safeMargin;
    const y = safeHeight > 0 ? safeMargin + yPercent * safeHeight : safeMargin;
    return { x: Math.round(x), y: Math.round(y) };
  }

  switch (overlay?.position) {
    case 'top-left':
      return { x: safeMargin, y: safeMargin };
    case 'bottom-left':
      return { x: safeMargin, y: safeMargin + safeHeight };
    case 'bottom-right':
      return { x: safeMargin + safeWidth, y: safeMargin + safeHeight };
    case 'center':
      return {
        x: Math.max(0, Math.round((videoWidth - overlayWidth) / 2)),
        y: Math.max(0, Math.round((videoHeight - overlayHeight) / 2)),
      };
    case 'top-right':
    default:
      return { x: safeMargin + safeWidth, y: safeMargin };
  }
};

async function transcodeClip(instance, inputName, outputName) {
  await runCommand(instance, [
    '-i',
    inputName,
    '-c:v',
    'libx264',
    '-preset',
    'ultrafast',
    '-crf',
    '23',
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
      overlay,
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
      'ultrafast',
      '-crf',
      '23',
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

const inferExtension = (value, fallback = '.mp4') => {
  if (!value) return fallback;
  let name = '';
  if (typeof value === 'string') {
    name = value;
  } else if (typeof value === 'object') {
    name = value.path || value.name || '';
  }
  if (typeof name === 'string') {
    const lower = name.toLowerCase();
    if (lower.endsWith('.webm')) return '.webm';
    if (lower.endsWith('.mov')) return '.mov';
    if (lower.endsWith('.mkv')) return '.mkv';
    if (lower.endsWith('.avi')) return '.avi';
    if (lower.endsWith('.mp4')) return '.mp4';
  }
  return fallback;
};

async function prepareClip(instance, clip, index) {
  const cleanup = new Set();
  const sourceExt = inferExtension(clip.source ?? clip.path ?? clip.name, '.webm');
  const sourceName = `clip_src_${index}${sourceExt}`;
  await writeInputFile(instance, sourceName, clip.source ?? clip.path);
  cleanup.add(sourceName);

  let workingBaseName = sourceName;
  if (!sourceName.endsWith('.mp4')) {
    const convertedName = `clip_src_${index}_conv.mp4`;
    await transcodeClip(instance, sourceName, convertedName);
    cleanup.add(convertedName);
    workingBaseName = convertedName;
  }

  const trimStart = Math.max(0, Number(clip.sourceIn ?? 0));
  const inferredDuration =
    clip.sourceOut != null
      ? Math.max(0, Number(clip.sourceOut) - trimStart)
      : Math.max(0, Number(clip.duration ?? 0));
  const requiresTrim = trimStart > 0 || (clip.sourceOut != null && Number.isFinite(clip.sourceOut));

  if (requiresTrim) {
    const trimmedName = `clip_trim_${index}.mp4`;
    const args = [];
    if (trimStart > 0) {
      args.push('-ss', trimStart.toFixed(3));
    }
    args.push('-i', workingBaseName);
    if (inferredDuration > 0) {
      args.push('-t', inferredDuration.toFixed(3));
    }
    // Prefer stream copy for MP4 to speed up trimming; fallback to re-encode if it fails
    const tryCopy = async () => {
      const copyArgs = [...args, '-c', 'copy', '-movflags', 'faststart', trimmedName];
      await runCommand(instance, copyArgs);
    };
    const reencode = async () => {
      const encArgs = [
        ...args,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', 'faststart',
        trimmedName,
      ];
      await runCommand(instance, encArgs);
    };

    try {
      if (sourceExt === '.mp4') {
        await tryCopy();
      } else {
        await reencode();
      }
    } catch (_) {
      await reencode();
    }
    cleanup.add(trimmedName);
    workingBaseName = trimmedName;
  }

  const hasOverlaySource = Boolean(clip.overlaySource);

  if (!hasOverlaySource) {
    const preparedName = `prepared_clip_${index}.mp4`;
    if (!requiresTrim && sourceExt === '.mp4') {
      // Fast path: no overlay, no trim, mp4 input → stream copy
      try {
        await runCommand(instance, [
          '-i', workingBaseName,
          '-c', 'copy',
          '-movflags', 'faststart',
          preparedName,
        ]);
      } catch (_) {
        await transcodeClip(instance, workingBaseName, preparedName);
      }
    } else {
      await transcodeClip(instance, workingBaseName, preparedName);
    }
    for (const name of cleanup) {
      await safeDelete(instance, name);
    }
    return preparedName;
  }

  const cameraExt = inferExtension(clip.overlaySource ?? clip.previewSource ?? clip.cameraPath, '.webm');
  const cameraInputName = `clip_camera_${index}${cameraExt}`;
  await writeInputFile(instance, cameraInputName, clip.overlaySource);
  cleanup.add(cameraInputName);

  let workingCameraName = cameraInputName;
  if (!cameraInputName.endsWith('.mp4')) {
    const convertedCamera = `clip_camera_${index}_conv.mp4`;
    await transcodeClip(instance, cameraInputName, convertedCamera);
    cleanup.add(convertedCamera);
    workingCameraName = convertedCamera;
  }
  if (trimStart > 0 || (clip.sourceOut != null && Number.isFinite(clip.sourceOut))) {
    const trimmedCamera = `clip_camera_trim_${index}.mp4`;
    const args = [];
    if (trimStart > 0) {
      args.push('-ss', trimStart.toFixed(3));
    }
    args.push('-i', workingCameraName);
    if (inferredDuration > 0) {
      args.push('-t', inferredDuration.toFixed(3));
    }
    const tryCopy = async () => {
      const copyArgs = [...args, '-c', 'copy', '-movflags', 'faststart', trimmedCamera];
      await runCommand(instance, copyArgs);
    };
    const reencode = async () => {
      const encArgs = [
        ...args,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-crf', '23',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac',
        '-b:a', '192k',
        '-movflags', 'faststart',
        trimmedCamera,
      ];
      await runCommand(instance, encArgs);
    };
    try {
      if (cameraExt === '.mp4') {
        await tryCopy();
      } else {
        await reencode();
      }
    } catch (_) {
      await reencode();
    }
    cleanup.add(trimmedCamera);
    workingCameraName = trimmedCamera;
  }

  try {
    const prepared = await composeClipWithOverlay(instance, {
      clip: {
        ...clip,
        duration: inferredDuration || clip.duration,
      },
      index,
      baseInputName: workingBaseName,
      cameraInputName: workingCameraName,
    });
    for (const name of cleanup) {
      await safeDelete(instance, name);
    }
    return prepared;
  } catch (error) {
    for (const name of cleanup) {
      await safeDelete(instance, name);
    }
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

    const metricsActive = shouldLogMetrics();
    const optSnapshot = snapshotOptions(options);
    let exportStart = metricsActive ? now() : 0;
    let inputBytes = null;
    const recordMetrics = (strategy, outputBytes, startTime) => {
      if (!metricsActive) {
        return;
      }
      const durationMs = Math.max(0, now() - startTime);
      const throughputMbps =
        durationMs > 0 && outputBytes != null
          ? Number(((outputBytes * 8) / (durationMs / 1000) / 1_000_000).toFixed(3))
          : null;
      emitMetric('ffmpeg:export', {
        strategy,
        durationMs,
        inputBytes,
        outputBytes,
        throughputMbps,
        options: optSnapshot,
        timestamp: Date.now(),
      });
    };

    if (metricsActive) {
      try {
        const inputBuffer = await instance.readFile(inputName);
        inputBytes = inputBuffer?.length ?? null;
      } catch {
        inputBytes = null;
      }
    }

    if (canCopyExport(options)) {
      const copyArgs = ['-i', inputName, '-c', 'copy', '-movflags', 'faststart', outputFile];
      try {
        await runCommand(instance, copyArgs);
        const copyBuffer = await instance.readFile(outputFile);
        recordMetrics('copy', copyBuffer?.length ?? null, exportStart);
        return copyBuffer;
      } catch (copyError) {
        if (metricsActive) {
          emitMetric('ffmpeg:exportCopyFallback', {
            message: copyError?.message || String(copyError),
            options: optSnapshot,
            timestamp: Date.now(),
          });
        }
        await safeDelete(instance, outputFile);
        exportStart = metricsActive ? now() : 0;
      }
    }

    const command = ['-i', inputName];

    const videoFilters = [];
    if (options.resolution) {
      videoFilters.push(`scale=${options.resolution}`);
    }
    if (options.fps) {
      videoFilters.push(`fps=${options.fps}`);
    }
    if (videoFilters.length > 0) {
      command.push('-vf', videoFilters.join(','));
    }

    if (options.bitrate) {
      command.push('-b:v', options.bitrate);
    }

    const targetCodec = options.codec && options.codec !== 'copy' ? options.codec : 'libx264';
    const presetValue = options.preset || 'veryfast';

    command.push('-c:v', targetCodec, '-c:a', 'aac');
    if (presetValue) {
      command.push('-preset', presetValue);
    }

    if (options.crf) {
      command.push('-crf', `${options.crf}`);
    } else {
      command.push('-crf', '23');
    }

    command.push('-movflags', 'faststart');
    command.push(outputFile);

    await runCommand(instance, command);

    const outputBuffer = await instance.readFile(outputFile);

    recordMetrics('encode', outputBuffer?.length ?? null, exportStart);

    return outputBuffer;
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

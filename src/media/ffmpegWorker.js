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

const emitRendererEvent = (name, detail) => {
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch (error) {
      // Swallow event emission errors to avoid breaking ffmpeg pipeline
    }
  }
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

      ffmpeg.on('progress', ({ progress, ratio, time }) => {
        emitRendererEvent('ffmpeg-progress', { progress, ratio, time });
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
    emitRendererEvent('ffmpeg-log', { type, message });
  };
  instance.on('log', listener);
  try {
    emitRendererEvent('ffmpeg-log', { type: 'command', message: args.join(' ') });
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

const MIN_XFADE_DURATION = 0.1;

const mapTransitionVideoFilter = (type) => {
  switch ((type || '').toLowerCase()) {
    case 'dip-to-black':
    case 'dip_to_black':
    case 'fadeblack':
      return 'fadeblack';
    case 'slide':
    case 'slide-left':
    case 'slideleft':
      return 'slideleft';
    case 'crossfade':
    case 'fade':
    default:
      return 'fade';
  }
};

const mapAudioCurveForEasing = (easing) => {
  switch ((easing || '').toLowerCase()) {
    case 'ease-in':
    case 'ease_in':
      return { c1: 'sin', c2: 'sin' };
    case 'ease-out':
    case 'ease_out':
      return { c1: 'exp', c2: 'exp' };
    case 'linear':
      return { c1: 'tri', c2: 'tri' };
    case 'ease-in-out':
    case 'ease':
    default:
      return { c1: 'tri', c2: 'tri' };
  }
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

async function transcodeClip(instance, inputName, outputName, options = {}) {
  const volume = Number.isFinite(options.volume) ? options.volume : 1;
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
    ...(volume !== 1 ? ['-af', `volume=${volume}`] : []),
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

  const volumeScalar = Number.isFinite(clip.volume) ? clip.volume : 1;

  const normalized = normalizeOverlayKeyframes(
    clip.overlayKeyframes,
    clip.duration,
    clip.overlayDefaults
  ).filter((segment) => segment.end > segment.start + 0.01);

  if (normalized.length === 0) {
    const fallbackName = `prepared_clip_${index}.mp4`;
    await transcodeClip(instance, baseInputName, fallbackName, {
      volume: volumeScalar,
    });
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
      ...(volumeScalar !== 1 ? ['-filter:a', `volume=${volumeScalar}`] : []),
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
  const volumeScalar = Math.max(0, Number(clip.volume ?? 1));
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
      if (volumeScalar !== 1) {
        throw new Error('Volume adjustment requires re-encode');
      }
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
        ...(volumeScalar !== 1 ? ['-af', `volume=${volumeScalar}`] : []),
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
    if (!requiresTrim && sourceExt === '.mp4' && volumeScalar === 1) {
      // Fast path: no overlay, no trim, mp4 input → stream copy
      try {
        await runCommand(instance, [
          '-i', workingBaseName,
          '-c', 'copy',
          '-movflags', 'faststart',
          preparedName,
        ]);
      } catch (_) {
        await transcodeClip(instance, workingBaseName, preparedName, {
          volume: volumeScalar,
        });
      }
    } else {
      await transcodeClip(instance, workingBaseName, preparedName, {
        volume: volumeScalar,
      });
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
        volume: volumeScalar,
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
  const tempArtifacts = new Set();

  const readDuration = (clip = {}) => {
    const explicit = Number(clip.duration);
    if (Number.isFinite(explicit)) {
      return Math.max(0, explicit);
    }
    const start = Number.isFinite(clip.start) ? clip.start : 0;
    const end = Number.isFinite(clip.end) ? clip.end : start;
    return Math.max(0, end - start);
  };

  const xfadeMerge = async (currentPath, currentDuration, nextPath, nextDuration, transition, index) => {
    const transitionDuration = Math.min(
      Math.max(MIN_XFADE_DURATION, Number(transition?.duration) || MIN_XFADE_DURATION),
      Math.max(MIN_XFADE_DURATION, currentDuration),
      Math.max(MIN_XFADE_DURATION, nextDuration)
    );

    if (!Number.isFinite(transitionDuration) || transitionDuration < MIN_XFADE_DURATION) {
      return null;
    }

    const offset = Math.max(0, currentDuration - transitionDuration);
    const transitionName = mapTransitionVideoFilter(transition?.type);
    const audioCurve = mapAudioCurveForEasing(transition?.easing);

    const filterVideo = `[0:v][1:v]xfade=transition=${transitionName}:duration=${transitionDuration.toFixed(
      3
    )}:offset=${offset.toFixed(3)}[v]`;
    const filterAudio = `[0:a][1:a]acrossfade=d=${transitionDuration.toFixed(
      3
    )}:c1=${audioCurve.c1}:c2=${audioCurve.c2}[a]`;

    const resultName = `xfade_result_${index}.mp4`;
    const commandBase = [
      '-i',
      currentPath,
      '-i',
      nextPath,
      '-filter_complex',
      `${filterVideo};${filterAudio}`,
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      'faststart',
      resultName,
    ];

    try {
      await runCommand(instance, commandBase);
      return {
        path: resultName,
        duration: currentDuration + nextDuration - transitionDuration,
      };
    } catch (error) {
      console.warn('Video+audio crossfade failed, falling back to video-only xfade', error);
      await safeDelete(instance, resultName);
    }

    const videoOnlyName = `xfade_result_video_${index}.mp4`;
    const videoOnlyCommand = [
      '-i',
      currentPath,
      '-i',
      nextPath,
      '-filter_complex',
      filterVideo,
      '-map',
      '[v]',
      '-map',
      '0:a?',
      '-map',
      '1:a?',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '20',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      'faststart',
      videoOnlyName,
    ];

    try {
      await runCommand(instance, videoOnlyCommand);
      return {
        path: videoOnlyName,
        duration: currentDuration + nextDuration - transitionDuration,
      };
    } catch (err) {
      console.warn('Video-only crossfade failed; falling back to hard cut concatenation', err);
      await safeDelete(instance, videoOnlyName);
      return null;
    }
  };

  try {
    for (let i = 0; i < clips.length; i += 1) {
      const prepared = await prepareClip(instance, clips[i], i);
      preparedClips.push({ path: prepared, clip: clips[i] });
    }

    if (preparedClips.length === 0) {
      throw new Error('No clips provided for concatenation');
    }

    let workingPath = preparedClips[0].path;
    let workingDuration = readDuration(preparedClips[0].clip);

    for (let i = 1; i < preparedClips.length; i += 1) {
      const prevEntry = preparedClips[i - 1];
      const nextEntry = preparedClips[i];
      const nextDuration = readDuration(nextEntry.clip);

      const transition =
        prevEntry.clip?.transitionOut?.toClipId === nextEntry.clip?.id
          ? prevEntry.clip.transitionOut
          : null;

      let merged = null;
      if (transition && Number(transition.duration) > MIN_XFADE_DURATION) {
        merged = await xfadeMerge(
          workingPath,
          workingDuration,
          nextEntry.path,
          nextDuration,
          transition,
          i
        );
      }

      if (merged) {
        tempArtifacts.add(workingPath);
        tempArtifacts.add(nextEntry.path);
        workingPath = merged.path;
        workingDuration = merged.duration;
        continue;
      }

      const concatListName = `concat_pair_${i}.txt`;
      const concatOutput = `concat_result_${i}.mp4`;
      const concatContent = `file '${workingPath}'\nfile '${nextEntry.path}'\n`;
      await instance.writeFile(concatListName, concatContent);

      try {
        await runCommand(instance, [
          '-f',
          'concat',
          '-safe',
          '0',
          '-i',
          concatListName,
          '-c',
          'copy',
          concatOutput,
        ]);
        tempArtifacts.add(workingPath);
        tempArtifacts.add(nextEntry.path);
        tempArtifacts.add(concatListName);
        workingPath = concatOutput;
        workingDuration += nextDuration;
      } catch (error) {
        console.warn('Concat demuxer stream-copy failed; retrying with re-encode', error);
        const fallbackName = `concat_reencode_${i}.mp4`;
        tempArtifacts.add(concatOutput);
        try {
          await runCommand(instance, [
            '-f',
            'concat',
            '-safe',
            '0',
            '-i',
            concatListName,
            '-c:v',
            'libx264',
            '-preset',
            'veryfast',
            '-crf',
            '20',
            '-c:a',
            'aac',
            '-b:a',
            '192k',
            '-movflags',
            'faststart',
            fallbackName,
          ]);
          tempArtifacts.add(workingPath);
          tempArtifacts.add(nextEntry.path);
          workingPath = fallbackName;
          workingDuration += nextDuration;
        } finally {
          tempArtifacts.add(concatListName);
        }
      }
    }

    if (workingPath !== outputFile) {
      await runCommand(instance, [
        '-i',
        workingPath,
        '-c',
        'copy',
        '-movflags',
        'faststart',
        outputFile,
      ]);
      tempArtifacts.add(workingPath);
    }

    return await instance.readFile(outputFile);
  } catch (error) {
    console.error('Error concatenating clips:', error);
    throw error;
  } finally {
    for (const entry of preparedClips) {
      await safeDelete(instance, entry.path);
    }
    for (const artifact of tempArtifacts) {
      await safeDelete(instance, artifact);
    }
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

    const format = (options.format || '').toLowerCase();
    const videoCodec = options.codec || (format === 'webm' ? 'libvpx-vp9' : format === 'mov' ? 'prores_ks' : 'libx264');
    const audioCodec = format === 'webm' ? 'libopus' : 'aac';

    command.push('-c:v', videoCodec, '-c:a', audioCodec, '-preset', options.preset || 'veryfast');

    if (options.crf) {
      command.push('-crf', `${options.crf}`);
    } else {
      command.push('-crf', '23');
    }

    if (format === 'webm') {
      command.push('-b:a', '192k');
      command.push('-row-mt', '1');
      command.push('-deadline', 'realtime');
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

export async function probeMedia(source) {
  const instance = await getFFmpeg();
  const inputName = 'probe-input';
  try {
    await writeInputFile(instance, inputName, source);
    if (typeof instance.probe === 'function') {
      return await instance.probe(inputName);
    }
    return null;
  } catch (error) {
    console.error('Error probing media:', error);
    throw error;
  } finally {
    await safeDelete(instance, inputName);
  }
}

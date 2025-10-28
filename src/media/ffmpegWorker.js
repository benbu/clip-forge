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
  const inputNames = [];
  const concatListName = 'concat.txt';
  const outputFile = outputName;

  try {
    for (let i = 0; i < clips.length; i += 1) {
      const clip = clips[i];
      const fileName = `input_${i}.mp4`;
      await writeInputFile(instance, fileName, clip.source ?? clip.path);
      inputNames.push(fileName);
    }

    const concatContent = inputNames.map((name) => `file '${name}'`).join('\n');
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
    for (const name of inputNames) {
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

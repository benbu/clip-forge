const { app } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

let cachedFfmpegPath = null;
let encoderSupport = null;
let encoderProbePromise = null;

const isWindows = process.platform === 'win32';

const fileExists = async (filePath) => {
  if (!filePath) return false;
  try {
    await fs.access(filePath);
    return true;
  } catch (_) {
    return false;
  }
};

const resolveFfmpegPath = async () => {
  if (cachedFfmpegPath) {
    return cachedFfmpegPath;
  }

  const envPath = process.env.CLIPFORGE_FFMPEG_PATH;
  if (envPath && (await fileExists(envPath))) {
    cachedFfmpegPath = envPath;
    return cachedFfmpegPath;
  }

  const exeName = isWindows ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [];

  if (app && typeof app.getAppPath === 'function') {
    const resourcesPath = process.resourcesPath || path.join(app.getAppPath(), '..', '..');
    candidates.push(path.join(resourcesPath, 'ffmpeg', exeName));
    candidates.push(path.join(resourcesPath, 'bin', exeName));
  }

  candidates.push(path.join(__dirname, '..', '..', 'bin', exeName));
  candidates.push(path.join(__dirname, '..', '..', 'node_modules', '.bin', exeName));

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      cachedFfmpegPath = candidate;
      return cachedFfmpegPath;
    }
  }

  // Final fallback: rely on system PATH
  cachedFfmpegPath = 'ffmpeg';
  return cachedFfmpegPath;
};

const detectHardwareEncoders = async () => {
  if (encoderSupport) {
    return encoderSupport;
  }

  if (!encoderProbePromise) {
    encoderProbePromise = (async () => {
      const binary = await resolveFfmpegPath();
      const result = { nvenc: false, qsv: false, amf: false };

      try {
        const proc = spawn(binary, ['-hide_banner', '-encoders'], { stdio: ['ignore', 'pipe', 'pipe'] });
        let buffer = '';
        proc.stdout.on('data', (chunk) => {
          buffer += chunk.toString();
        });
        proc.stderr.on('data', (chunk) => {
          buffer += chunk.toString();
        });
        await new Promise((resolve) => {
          proc.once('close', () => resolve());
          proc.once('error', () => resolve());
        });

        const lower = buffer.toLowerCase();
        result.nvenc = lower.includes('h264_nvenc') || lower.includes('hevc_nvenc');
        result.qsv = lower.includes('h264_qsv') || lower.includes('hevc_qsv');
        result.amf = lower.includes('h264_amf') || lower.includes('hevc_amf');
      } catch (error) {
        console.warn('FFmpeg hardware encoder probe failed:', error?.message || error);
      }

      encoderSupport = result;
      return result;
    })();
  }

  return encoderProbePromise;
};

const chooseEncoder = async (preference = 'auto') => {
  if (preference && preference !== 'auto' && preference !== 'cpu') {
    return preference;
  }

  if (preference === 'cpu') {
    return 'libx264';
  }

  const support = await detectHardwareEncoders();
  if (support.nvenc) return 'h264_nvenc';
  if (support.qsv) return 'h264_qsv';
  if (support.amf) return 'h264_amf';
  return 'libx264';
};

const toSeconds = (timecode = '') => {
  if (!timecode || typeof timecode !== 'string') return null;
  const match = timecode.match(/(?:(\d+):)?(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);
  if ([hours, minutes, seconds].some((value) => !Number.isFinite(value))) return null;
  return hours * 3600 + minutes * 60 + seconds;
};

const parseProgressLine = (line) => {
  const [key, value] = line.split('=');
  if (!key) return null;
  return { key: key.trim(), value: (value || '').trim() };
};

const tmpFile = async (extension = '.mp4') => {
  const tempDir = app ? app.getPath('temp') : os.tmpdir();
  const name = `clipforge-export-${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  return path.join(tempDir, name);
};

async function transcodeToMp4({
  inputPath,
  outputPath = null,
  options = {},
  onProgress,
}) {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('transcodeToMp4 requires a valid input path');
  }

  const destination = outputPath || (await tmpFile('.mp4'));
  const ffmpegPath = await resolveFfmpegPath();
  const encoder = await chooseEncoder(options.hardware || 'auto');

  const args = ['-y', '-nostdin', '-hide_banner', '-loglevel', 'error', '-progress', 'pipe:1'];
  args.push('-i', inputPath);

  if (options.resolution) {
    args.push('-vf', `scale=${options.resolution}`);
  }

  if (options.fps) {
    args.push('-r', String(options.fps));
  }

  if (options.bitrate) {
    args.push('-b:v', options.bitrate);
  }

  if (encoder === 'libx264') {
    args.push('-c:v', 'libx264');
    args.push('-preset', options.preset || 'veryfast');
    args.push('-crf', options.crf != null ? String(options.crf) : '23');
  } else {
    args.push('-c:v', encoder);
    if (options.preset) {
      args.push('-preset', options.preset);
    }
    if (options.crf != null) {
      args.push('-rc-lookahead', '20');
      args.push('-cq', String(options.crf));
    }
  }

  args.push('-c:a', 'aac');
  if (options.audioBitrate) {
    args.push('-b:a', options.audioBitrate);
  }

  args.push('-movflags', 'faststart');
  args.push(destination);

  const start = Date.now();
  let progressBuffer = '';
  let stderrBuffer = '';

  const child = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  child.stdout.on('data', (chunk) => {
    progressBuffer += chunk.toString();
    const lines = progressBuffer.split(/\r?\n/);
    progressBuffer = lines.pop() || '';
    let outTime = null;
    for (const line of lines) {
      const parsed = parseProgressLine(line);
      if (!parsed) continue;
      if (parsed.key === 'out_time') {
        outTime = toSeconds(parsed.value);
      }
      if (parsed.key === 'progress' && parsed.value === 'end') {
        if (typeof onProgress === 'function') {
          onProgress({ ratio: 1, encoder });
        }
      }
    }
    if (outTime != null && typeof onProgress === 'function') {
      const durationSeconds = Number(options.durationSeconds);
      const ratio = durationSeconds && durationSeconds > 0
        ? Math.min(1, Math.max(0, outTime / durationSeconds))
        : null;
      onProgress({
        ratio,
        seconds: outTime,
        encoder,
      });
    }
  });

  child.stderr.on('data', (chunk) => {
    stderrBuffer += chunk.toString();
  });

  const exitCode = await new Promise((resolve, reject) => {
    child.once('error', (error) => reject(error));
    child.once('close', (code) => resolve(code));
  }).catch((error) => {
    child.kill('SIGKILL');
    throw error;
  });

  if (exitCode !== 0) {
    const message = stderrBuffer || `FFmpeg exited with code ${exitCode}`;
    throw new Error(message.trim());
  }

  return {
    outputPath: destination,
    encoder,
    durationMs: Date.now() - start,
  };
}

module.exports = {
  resolveFfmpegPath,
  detectHardwareEncoders,
  transcodeToMp4,
};


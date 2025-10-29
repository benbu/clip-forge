/**
 * Waveform Service - Computes and caches audio waveform peak data
 */

const DEFAULT_SAMPLE_COUNT = 400;
let sharedAudioContext = null;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

async function getAudioContext() {
  if (typeof window === 'undefined') {
    throw new Error('AudioContext unavailable in this environment');
  }

  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    return sharedAudioContext;
  }

  const ContextCtor =
    window.AudioContext ||
    window.webkitAudioContext ||
    window.mozAudioContext ||
    window.msAudioContext;

  if (!ContextCtor) {
    throw new Error('Web Audio API not supported');
  }

  sharedAudioContext = new ContextCtor({
    latencyHint: 'interactive',
  });
  return sharedAudioContext;
}

function downsamplePeaks(audioBuffer, sampleCount = DEFAULT_SAMPLE_COUNT) {
  const { numberOfChannels, length } = audioBuffer;
  const channels = [];
  const peaksPerChannel = new Float32Array(sampleCount * 2); // min/max pairs

  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    channels.push(audioBuffer.getChannelData(channel));
  }

  const blockSize = Math.max(1, Math.floor(length / sampleCount));
  for (let i = 0; i < sampleCount; i += 1) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, length);

    let min = 1.0;
    let max = -1.0;

    for (let channel = 0; channel < numberOfChannels; channel += 1) {
      const channelData = channels[channel];
      for (let j = start; j < end; j += 1) {
        const sample = channelData[j];
        if (sample < min) min = sample;
        if (sample > max) max = sample;
      }
    }

    peaksPerChannel[i * 2] = clamp(min, -1, 1);
    peaksPerChannel[i * 2 + 1] = clamp(max, -1, 1);
  }

  return {
    samples: sampleCount,
    peaks: Array.from(peaksPerChannel),
  };
}

const toArrayBuffer = async (input) => {
  if (!input) {
    throw new Error('Missing waveform input');
  }

  if (input.arrayBuffer && typeof input.arrayBuffer === 'function') {
    return await input.arrayBuffer();
  }

  if (input instanceof ArrayBuffer) {
    return input.slice(0);
  }

  if (ArrayBuffer.isView(input)) {
    return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
  }

  if (input.buffer) {
    const view = input.buffer;
    if (view instanceof ArrayBuffer) {
      return view.slice(0);
    }
    if (ArrayBuffer.isView(view)) {
      return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength);
    }
  }

  throw new Error('Unsupported waveform input type');
};

const getInputSizeBytes = (input) => {
  if (!input) return null;
  if (Number.isFinite(input.byteLength)) return Number(input.byteLength);
  if (Number.isFinite(input.size)) return Number(input.size);
  if (ArrayBuffer.isView(input)) return input.byteLength;
  if (ArrayBuffer.isView(input?.buffer)) return input.buffer.byteLength;
  if (Number.isFinite(input?.buffer?.byteLength)) return Number(input.buffer.byteLength);
  return null;
};

export async function computeWaveformPeaks(input, options = {}) {
  const maxFileSizeBytes = options.maxFileSizeBytes ?? 50 * 1024 * 1024; // 50MB default
  const sizeBytes = getInputSizeBytes(input);
  if (Number.isFinite(sizeBytes) && sizeBytes > maxFileSizeBytes) {
    throw new Error('File too large for waveform extraction');
  }

  const arrayBuffer = await toArrayBuffer(input);
  const audioContext = await getAudioContext();
  const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const sampleCount = clamp(
    Number(options.sampleCount) || DEFAULT_SAMPLE_COUNT,
    64,
    2000
  );
  const waveform = downsamplePeaks(decoded, sampleCount);

  return {
    version: 1,
    duration: decoded.duration,
    sampleRate: decoded.sampleRate,
    channels: decoded.numberOfChannels,
    ...waveform,
  };
}

export function releaseWaveformResources() {
  if (sharedAudioContext && sharedAudioContext.state !== 'closed') {
    sharedAudioContext.close().catch(() => {});
  }
  sharedAudioContext = null;
}

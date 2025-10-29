#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { performance } from 'perf_hooks';
import { createFFmpeg } from '@ffmpeg/ffmpeg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const usage = `\nUsage: node scripts/benchmark-export.mjs --input <file.webm> [--input <file2.webm>] [--repeat 3] [--preset draft|production] [--save ./out] [--verbose]\n`;

const presets = {
  draft: {
    resolution: null,
    fps: 30,
    bitrate: '4000k',
    codec: 'libx264',
    crf: 28,
    preset: 'superfast',
  },
  production: {
    resolution: null,
    fps: 60,
    bitrate: '8000k',
    codec: 'libx264',
    crf: 23,
    preset: 'veryfast',
  },
};

function parseArgs(argv) {
  const args = {
    inputs: [],
    repeat: 1,
    preset: 'production',
    saveDir: null,
    verbose: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--input' || token === '-i') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --input');
      }
      args.inputs.push(path.resolve(value));
      i += 1;
    } else if (token === '--repeat' || token === '-r') {
      const value = Number(argv[i + 1]);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error('Repeat must be a positive number');
      }
      args.repeat = Math.floor(value);
      i += 1;
    } else if (token === '--preset' || token === '-p') {
      const value = argv[i + 1];
      if (!value || !presets[value]) {
        throw new Error(`Unknown preset "${value}"`);
      }
      args.preset = value;
      i += 1;
    } else if (token === '--save') {
      const value = argv[i + 1];
      if (!value) {
        throw new Error('Missing value for --save');
      }
      args.saveDir = path.resolve(value);
      i += 1;
    } else if (token === '--verbose') {
      args.verbose = true;
    } else if (token === '--help' || token === '-h') {
      console.log(usage);
      process.exit(0);
    } else {
      throw new Error(`Unknown argument "${token}"`);
    }
  }

  if (args.inputs.length === 0) {
    throw new Error('At least one --input file is required');
  }

  return args;
}

async function ensureFilesExist(pathsToCheck) {
  const missing = [];
  await Promise.all(
    pathsToCheck.map(async (filePath) => {
      try {
        await fs.access(filePath);
      } catch {
        missing.push(filePath);
      }
    })
  );

  if (missing.length > 0) {
    throw new Error(`Missing input files:\n- ${missing.join('\n- ')}`);
  }
}

async function runSingleBenchmark(ffmpeg, inputPath, iteration, options, saveDir) {
  const inputName = `input-${iteration}.webm`;
  const outputName = `output-${iteration}.mp4`;

  const inputData = await fs.readFile(inputPath);
  ffmpeg.FS('writeFile', inputName, new Uint8Array(inputData));

  const command = ['-i', inputName];

  if (options.resolution) {
    command.push('-vf', `scale=${options.resolution}`);
  }

  if (options.fps != null) {
    command.push('-r', String(options.fps));
  }

  if (options.bitrate) {
    command.push('-b:v', options.bitrate);
  }

  command.push('-c:v', options.codec || 'libx264', '-c:a', 'aac', '-preset', options.preset || 'veryfast');

  if (options.crf != null) {
    command.push('-crf', String(options.crf));
  }

  command.push(outputName);

  const start = performance.now();
  await ffmpeg.run(...command);
  const durationMs = Math.max(0, performance.now() - start);

  const outputData = ffmpeg.FS('readFile', outputName);

  if (saveDir) {
    await fs.mkdir(saveDir, { recursive: true });
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const fileName = `${baseName}-iter${iteration + 1}.mp4`;
    await fs.writeFile(path.join(saveDir, fileName), outputData);
  }

  const outputBytes = outputData.length;
  const inputBytes = inputData.length;
  const throughputMbps =
    durationMs > 0
      ? Number(((outputBytes * 8) / (durationMs / 1000) / 1_000_000).toFixed(3))
      : null;

  try {
    ffmpeg.FS('unlink', inputName);
  } catch {
    // ignore cleanup errors
  }

  try {
    ffmpeg.FS('unlink', outputName);
  } catch {
    // ignore cleanup errors
  }

  return {
    durationMs,
    throughputMbps,
    outputBytes,
    inputBytes,
  };
}

function formatNumber(value, digits = 2) {
  if (value == null || Number.isNaN(value)) {
    return 'n/a';
  }
  return Number.parseFloat(value).toFixed(digits);
}

function summarize(metrics) {
  const durations = metrics.map((item) => item.durationMs).sort((a, b) => a - b);
  const average = durations.reduce((acc, value) => acc + value, 0) / durations.length;
  const min = durations[0];
  const max = durations[durations.length - 1];
  const throughput = metrics
    .map((item) => item.throughputMbps)
    .filter((value) => typeof value === 'number');
  const avgThroughput =
    throughput.length > 0
      ? throughput.reduce((acc, value) => acc + value, 0) / throughput.length
      : null;

  return {
    averageMs: average,
    minMs: min,
    maxMs: max,
    avgThroughputMbps: avgThroughput,
  };
}

(async () => {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`\n${error.message}`);
    console.log(usage);
    process.exitCode = 1;
    return;
  }

  try {
    await ensureFilesExist(args.inputs);
  } catch (error) {
    console.error(`\n${error.message}`);
    process.exitCode = 1;
    return;
  }

  if (args.saveDir) {
    await fs.mkdir(args.saveDir, { recursive: true });
  }

  const corePath = path.join(__dirname, '..', 'node_modules', '@ffmpeg', 'core', 'dist', 'ffmpeg-core.js');

  try {
    await fs.access(corePath);
  } catch {
    console.error('FFmpeg core not found. Run "npm install" at project root to install dependencies.');
    process.exitCode = 1;
    return;
  }

  const ffmpeg = createFFmpeg({
    log: args.verbose,
    corePath,
  });

  if (args.verbose) {
    console.log('Loading FFmpeg (WASM)...');
  }

  const loadStart = performance.now();
  await ffmpeg.load();
  const loadDuration = Math.max(0, performance.now() - loadStart);

  if (args.verbose) {
    console.log(`FFmpeg loaded in ${formatNumber(loadDuration)} ms`);
  }

  const options = presets[args.preset] || presets.production;
  const results = [];

  for (const inputPath of args.inputs) {
    const perFileMetrics = [];
    if (args.verbose) {
      console.log(`\nBenchmarking ${inputPath} (${args.repeat} runs)...`);
    }
    for (let iteration = 0; iteration < args.repeat; iteration += 1) {
      const measurement = await runSingleBenchmark(
        ffmpeg,
        inputPath,
        iteration,
        options,
        args.saveDir
      );
      perFileMetrics.push(measurement);
      if (args.verbose) {
        console.log(
          `  Run ${iteration + 1}: ${formatNumber(measurement.durationMs)} ms, throughput ${formatNumber(
            measurement.throughputMbps
          )} Mbps`
        );
      }
    }
    results.push({ file: inputPath, metrics: perFileMetrics });
  }

  console.log('\n=== ClipForge Export Benchmark ===');
  console.log(`Preset: ${args.preset}`);
  console.log(`FFmpeg load time: ${formatNumber(loadDuration)} ms`);

  const summaryRows = results.map(({ file, metrics }) => {
    const summary = summarize(metrics);
    return {
      file: path.basename(file),
      runs: metrics.length,
      averageMs: Number(formatNumber(summary.averageMs)),
      minMs: Number(formatNumber(summary.minMs)),
      maxMs: Number(formatNumber(summary.maxMs)),
      throughputMbps: Number(
        summary.avgThroughputMbps != null ? formatNumber(summary.avgThroughputMbps) : '0'
      ),
    };
  });

  console.table(summaryRows);

  console.log('\nPro tip: set CLIPFORGE_EXPORT_METRICS=1 while running the desktop app to stream live export metrics.');
})();


import { writeFileSync } from 'node:fs';
import { cpus, platform as osPlatform, release, totalmem } from 'node:os';
import { Session } from 'node:inspector/promises';
import { processCorpus } from './bench-corpus.mjs';

export function environmentMetadata() {
  const cpu = cpus()[0];
  return {
    node: process.version,
    v8: process.versions.v8,
    platform: osPlatform(),
    arch: process.arch,
    osRelease: release(),
    cpuModel: cpu?.model ?? null,
    cpuCount: cpus().length,
    totalMemory: totalmem(),
    nodeFlags: [...process.execArgv],
    nodeEnv: process.env.NODE_ENV,
    finalizationMode:
      process.env.NODE_ENV === 'production' ? 'production' : 'development',
  };
}

export function resourceMetadata() {
  const usage = process.resourceUsage();
  return {
    userCPUTime: usage.userCPUTime,
    systemCPUTime: usage.systemCPUTime,
    maxRSS: usage.maxRSS,
    fsRead: usage.fsRead,
    fsWrite: usage.fsWrite,
    voluntaryContextSwitches: usage.voluntaryContextSwitches,
    involuntaryContextSwitches: usage.involuntaryContextSwitches,
  };
}

export async function runMeasuredCorpus(corpus, processor, args, profilePath) {
  for (let warmup = 0; warmup < args.warmup; warmup++) {
    await processCorpus(corpus, processor, false);
  }

  let session;
  let profiling = false;
  const totalSamples = [];
  const perFileSamples = Object.fromEntries(
    corpus.map(({ name }) => [name, []])
  );
  const outputHashes = {};

  try {
    if (profilePath) {
      session = new Session();
      session.connect();
      await session.post('Profiler.enable');
      await session.post('Profiler.start');
      profiling = true;
    }

    for (let sample = 0; sample < args.iters; sample++) {
      const pass = await processCorpus(corpus, processor, true);
      totalSamples.push(pass.elapsed);
      for (const { name } of corpus) {
        perFileSamples[name].push(pass.samples[name]);
        const hash = pass.outputs[name];
        if (outputHashes[name] === undefined) outputHashes[name] = hash;
        if (outputHashes[name] !== hash) {
          throw new Error(`output changed during benchmark for ${name}`);
        }
      }
    }

    if (session) {
      const { profile } = await session.post('Profiler.stop');
      profiling = false;
      writeFileSync(profilePath, JSON.stringify(profile));
    }
  } finally {
    if (session) {
      if (profiling) {
        try {
          await session.post('Profiler.stop');
        } catch {
          // The inspector may already be closed while handling another error.
        }
      }
      session.disconnect();
    }
  }

  return { totalSamples, perFileSamples, outputHashes };
}

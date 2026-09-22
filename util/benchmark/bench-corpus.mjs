import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { benchmarkCases } from './bench-cases.mjs';

function hashOutput(css) {
  return createHash('sha256').update(css).digest('hex');
}

export function corpusManifest(files) {
  const manifest = createHash('sha256');
  for (const file of [...files].toSorted((a, b) =>
    a.name.localeCompare(b.name)
  )) {
    manifest.update(file.name);
    manifest.update('\0');
    manifest.update(createHash('sha256').update(file.source).digest('hex'));
    manifest.update('\n');
  }
  return manifest.digest('hex');
}

export function shuffleCorpus(corpus, seed, replicateIndex) {
  return [...corpus].toSorted((a, b) => {
    const aKey = createHash('sha256')
      .update(`${seed}\0${replicateIndex}\0${a.name}`)
      .digest('hex');
    const bKey = createHash('sha256')
      .update(`${seed}\0${replicateIndex}\0${b.name}`)
      .digest('hex');
    return aKey.localeCompare(bKey);
  });
}

function manifestNames(path) {
  const names = readFileSync(path, 'utf8')
    .split('\n')
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length) throw new Error(`corpus manifest is empty: "${path}"`);
  if (new Set(names).size !== names.length) {
    throw new Error(`corpus manifest contains duplicate names: "${path}"`);
  }
  return names;
}

export function selectCorpus(args, directory) {
  if (args.case && args.corpusManifest) {
    throw new Error('--case and --corpus-manifest cannot be used together');
  }
  let selectors = [];
  if (Array.isArray(args.only)) selectors = args.only;
  else if (args.only) selectors = [args.only];
  const manifest = args.corpusManifest
    ? manifestNames(args.corpusManifest)
    : null;
  const corpus = args.case
    ? [{ name: args.case, source: benchmarkCases[args.case].css }]
    : readdirSync(directory)
        .filter((file) => file.endsWith('.css'))
        .map((file) => ({
          file,
          name: basename(file, '.css'),
        }))
        .filter(
          ({ name }) =>
            (!manifest || manifest.includes(name)) &&
            (!selectors.length || selectors.some((only) => name.includes(only)))
        )
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .map(({ file, name }) => ({
          name,
          source: readFileSync(join(directory, file), 'utf8'),
        }));
  if (!corpus.length) throw new Error('selected corpus contains no CSS files');
  if (manifest && !selectors.length) {
    const missing = manifest.filter(
      (name) => !corpus.some((entry) => entry.name === name)
    );
    if (missing.length) {
      throw new Error(
        `corpus manifest names are missing from the corpus: ${missing.join(', ')}`
      );
    }
  }
  return corpus;
}

export async function processCorpus(
  corpus,
  processor,
  measure,
  { hash = hashOutput, now = () => performance.now() } = {}
) {
  const samples = {};
  const outputs = {};
  const processedOutputs = [];
  const started = now();
  for (const { name, source } of corpus) {
    const fileStarted = now();
    const result = await processor.process(source, { from: undefined });
    const css = result.css;
    const elapsed = now() - fileStarted;
    if (!Number.isFinite(elapsed) || elapsed < 0) {
      throw new RangeError(
        `elapsed timing must be a non-negative finite number; got ${elapsed} for "${name}"`
      );
    }
    if (measure) {
      samples[name] = elapsed;
      processedOutputs.push({ name, css });
    }
  }
  const elapsed = now() - started;
  if (!Number.isFinite(elapsed) || elapsed < 0) {
    throw new RangeError(
      `total elapsed timing must be a non-negative finite number; got ${elapsed}`
    );
  }
  for (const { name, css } of processedOutputs) outputs[name] = hash(css);
  return { elapsed, samples, outputs };
}

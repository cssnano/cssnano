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

export function selectCorpus(args, directory) {
  const corpus = args.case
    ? [{ name: args.case, source: benchmarkCases[args.case].css }]
    : readdirSync(directory)
        .filter((file) => file.endsWith('.css'))
        .filter((file) => !args.only || file.includes(args.only))
        .toSorted()
        .map((file) => ({
          name: basename(file, '.css'),
          source: readFileSync(join(directory, file), 'utf8'),
        }));
  if (!corpus.length) throw new Error('selected corpus contains no CSS files');
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
    if (measure) {
      samples[name] = elapsed;
      processedOutputs.push({ name, css });
    }
  }
  const elapsed = now() - started;
  for (const { name, css } of processedOutputs) outputs[name] = hash(css);
  return { elapsed, samples, outputs };
}

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { corpusManifest } from './bench-corpus.js';

function corpusNames(dir) {
  if (!existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((file) => file.endsWith('.css'))
    .map((file) => file.slice(0, -'.css'.length))
    .toSorted();
}

function fixtureDigest(dir, name) {
  try {
    return createHash('sha256')
      .update(readFileSync(join(dir, `${name}.css`)))
      .digest('hex');
  } catch {
    return null;
  }
}

function selectedNames(names, { only = null, manifest = null } = {}) {
  let selectors = [];
  if (Array.isArray(only)) selectors = only;
  else if (only) selectors = [only];
  return names.filter(
    (name) =>
      (!manifest || manifest.includes(name)) &&
      (!selectors.length ||
        selectors.some((selector) => name.includes(selector)))
  );
}

function digestCorpus(dir, names) {
  try {
    return corpusManifest(
      names.map((name) => ({
        name,
        source: readFileSync(join(dir, `${name}.css`), 'utf8'),
      }))
    );
  } catch {
    return null;
  }
}

export function compareCorpora(
  baseDir,
  candidateDir,
  { only = null, manifest = null } = {}
) {
  const baseAll = corpusNames(baseDir);
  const candidateAll = corpusNames(candidateDir);
  const base = baseAll && selectedNames(baseAll, { only, manifest });
  const candidate =
    candidateAll && selectedNames(candidateAll, { only, manifest });
  const baseSet = new Set(base ?? []);
  const candidateSet = new Set(candidate ?? []);
  const common = [...baseSet]
    .filter((name) => candidateSet.has(name))
    .toSorted();
  // Identical names are not enough: the sides must process the same CSS
  // sources, so common fixtures are compared by content digest.
  const contentMismatches = common.filter((name) => {
    const baseDigest = fixtureDigest(baseDir, name);
    const candidateDigest = fixtureDigest(candidateDir, name);
    return (
      baseDigest === null ||
      candidateDigest === null ||
      baseDigest !== candidateDigest
    );
  });
  return {
    base,
    candidate,
    common,
    baseHash: base ? digestCorpus(baseDir, base) : null,
    candidateHash: candidate ? digestCorpus(candidateDir, candidate) : null,
    contentMismatches,
    baseOnly: [...baseSet].filter((name) => !candidateSet.has(name)).toSorted(),
    candidateOnly: [...candidateSet]
      .filter((name) => !baseSet.has(name))
      .toSorted(),
  };
}

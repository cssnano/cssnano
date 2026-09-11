// Benchmark-only loader that injects call counters into postcss-merge-longhand
// source modules. Registered by merge-longhand-counters.mjs before the plugin
// module graph loads; never imported by production code.
//
// Each seam is an exact source anchor with a counter statement injected after
// it. Anchors fail loudly when the source changes so the ledger does not
// silently measure a stale shape.

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const src = (rel) =>
  pathToFileURL(resolve(root, 'packages/postcss-merge-longhand/src', rel)).href;

/** @type {Map<string, {anchor: string, inject: string}[]>} */
const seams = new Map();

/** @param {string} rel @param {string} anchor @param {string} key */
function seam(rel, anchor, key) {
  const url = src(rel);
  const entries = seams.get(url) ?? [];
  const inject = key.startsWith('pass.')
    ? `  globalThis.mergeLonghandCounters.pass['${key.slice(5)}']++;`
    : `  globalThis.mergeLonghandCounters['${key}']++;`;
  entries.push({ anchor, inject });
  seams.set(url, entries);
}

seam(
  'lib/mergeRules.js',
  'function mergeRules(rule, properties, callback) {',
  'mergeRules'
);
seam(
  'lib/insertCloned.js',
  'function insertCloned(rule, decl, props) {',
  'insertCloned'
);
seam(
  'lib/getDecls.js',
  'function getDeclarationsThatMatchProperties(rule, properties) {',
  'getDecls'
);
seam(
  'lib/cleanupDeclarations.js',
  'function cleanupDeclarations(declarations, isLowerPrecedence) {',
  'cleanupDeclarations'
);
seam(
  'index.js',
  'function rewrite(rule, family, prefix, declarations) {',
  'rewrite'
);
seam('lib/decl/borders.js', 'function merge(rule) {', 'mergeBorder');
seam(
  'lib/decl/borderLifecycle.js',
  'export function explode(rule) {',
  'explodeBorder'
);
seam(
  'lib/decl/borderLifecycle.js',
  'export function cleanup(rule) {',
  'cleanupBorder'
);
seam(
  'lib/decl/borderMatrix.js',
  'function resolveBorderGrid(rule) {',
  'resolveBorderGrid'
);
seam('lib/decl/boxBase.js', 'explode: (rule) => {', 'explodeBox');
seam('lib/decl/boxBase.js', 'merge: (rule) => {', 'mergeBox');

for (const key of [
  'mergeSideComponentsToSide',
  'mergeSideComponentsToComponent',
  'mergeSidesToComponents',
  'rebindSideCustomProp',
  'rebindComponentCustomProp',
]) {
  seam(
    'lib/decl/borderMerges.js',
    `export function ${key}(rule) {`,
    `pass.${key}`
  );
}

for (const key of [
  'mergeComponentsToBorder',
  'mergeComponentsToBorderAndSides',
  'mergeSidesToBorder',
]) {
  seam(
    'lib/decl/borderMerges.js',
    `export function ${key}(rule, canCreateBorder) {`,
    `pass.${key}`
  );
}

for (const key of [
  'optimizeSides',
  'mergeRedundantSweep',
  'hoistSubsumedComponents',
]) {
  seam(
    'lib/decl/borderFinalizers.js',
    `export function ${key}(rule) {`,
    `pass.${key}`
  );
}

/**
 * @param {string} url
 * @param {object} context
 * @param {(url: string, context: object) => Promise<{format?: string, source?: string | ArrayBuffer}>} nextLoad
 */
export async function load(url, context, nextLoad) {
  const result = await nextLoad(url, context);

  if (result.format !== 'module' || result.source === undefined) {
    return result;
  }
  const source =
    typeof result.source === 'string'
      ? result.source
      : Buffer.from(result.source).toString('utf8');

  const entries = seams.get(url);
  if (!entries) {
    return result;
  }

  let transformed = source;
  for (const { anchor, inject } of entries) {
    if (!transformed.includes(anchor)) {
      throw new Error(
        `counter anchor missing in ${url}: ${JSON.stringify(anchor)}`
      );
    }
    transformed = transformed.replace(anchor, `${anchor}\n${inject}`);
  }

  return { ...result, source: transformed };
}

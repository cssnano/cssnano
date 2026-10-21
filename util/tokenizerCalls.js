// Run as `node --import ./util/countTokenize.js util/tokenizerCalls.js`.
// Prints the `tokenize` calls that preset-default makes over the framework
// corpus, per plugin entry.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { counter } from './countTokenize.js';
import { repositoryFile } from './testHelpers.js';

/** @typedef {(this: unknown, ...args: unknown[]) => unknown} Listener */
/** @typedef {Record<string, unknown>} Plugin */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssnanoDir = join(root, 'packages', 'cssnano');
const frameworksDir = join(root, 'frameworks');

const require = createRequire(join(cssnanoDir, 'package.json'));
const postcss = (await import(pathToFileURL(require.resolve('postcss')).href))
  .default;
const { default: presetDefault } = await import(
  pathToFileURL(join(cssnanoDir, 'src', 'presets', 'default.js')).href
);

/**
 * Labels each plugin by its PostCSS name, and numbers repeats, so the two
 * `mergeLonghand` entries stay apart.
 *
 * @param {Plugin[]} plugins
 * @return {{ label: string, plugin: Plugin }[]}
 */
function labelled(plugins) {
  /** @type {Map<string, number>} */
  const seen = new Map();
  return plugins.map((plugin) => {
    const name = String(plugin.postcssPlugin);
    const occurrence = (seen.get(name) ?? 0) + 1;
    seen.set(name, occurrence);
    return {
      label: occurrence === 1 ? name : `${name}#${occurrence}`,
      plugin,
    };
  });
}

/**
 * Runs `listener` with `label` as the entry, so each tokenize call it makes
 * is attributed to that entry.
 *
 * @param {string} label
 * @param {Listener} listener
 * @return {Listener}
 */
function inEntry(label, listener) {
  return function attributedListener(...args) {
    const previous = counter.entry;
    counter.entry = label;
    try {
      return listener.apply(this, args);
    } finally {
      counter.entry = previous;
    }
  };
}

/**
 * Wraps the listeners of a visitor object, including per-property ones such
 * as `Declaration: { color() {} }`.
 *
 * @param {Plugin} visitors
 * @param {string} label
 * @return {Plugin}
 */
function attributeVisitors(visitors, label) {
  return Object.fromEntries(
    Object.entries(visitors).map(([name, listener]) => [
      name,
      typeof listener === 'function'
        ? inEntry(label, /** @type {Listener} */ (listener))
        : attributeVisitors(/** @type {Plugin} */ (listener), label),
    ])
  );
}

/**
 * Copies a plugin so its listeners record the entry they run under. A
 * `prepare` hook returns the listeners for one run, so its result is
 * wrapped too. PostCSS runs one plugin's listeners at a time, so the entry is
 * correct for every call made during a listener.
 *
 * @param {Plugin} plugin
 * @param {string} label
 * @return {Plugin}
 */
function attributed(plugin, label) {
  /** @type {Plugin} */
  const copy = { ...plugin };
  for (const [key, value] of Object.entries(plugin)) {
    if (typeof value !== 'function') continue;
    const listener = /** @type {Listener} */ (value);
    if (key === 'prepare') {
      copy[key] = /** @type {Listener} */ (
        function attributedPrepare(...args) {
          const visitors = /** @type {Plugin | undefined} */ (
            inEntry(label, listener).apply(this, args)
          );
          return visitors === undefined || visitors === null
            ? visitors
            : attributeVisitors(visitors, label);
        }
      );
    } else {
      copy[key] = inEntry(label, listener);
    }
  }
  return copy;
}

/** @type {string[]} */
const labels = [];
const fixtures = readdirSync(frameworksDir);
for (const file of fixtures) {
  const css = readFileSync(join(frameworksDir, file), 'utf8');
  const entries = labelled(/** @type {Plugin[]} */ (presetDefault()));
  for (const { label } of entries) {
    if (!labels.includes(label)) labels.push(label);
  }
  const plugins = entries.map(({ label, plugin }) => attributed(plugin, label));
  await postcss(plugins).process(css, { from: repositoryFile });
}

const rows = labels.map((label) => ({
  label,
  calls: counter.calls.get(label) ?? 0,
  distinct: counter.strings.get(label)?.size ?? 0,
}));
const everyString = new Set();
for (const seen of counter.strings.values()) {
  for (const input of seen) everyString.add(input);
}
// The merge transforms share strings, so their distinct count is a union.
const mergeLabels = labels.filter((label) =>
  /^postcss-(merge-|discard-duplicates)/v.test(label)
);
const mergeStrings = new Set();
for (const label of mergeLabels) {
  for (const input of counter.strings.get(label) ?? []) mergeStrings.add(input);
}
let mergeCalls = 0;
for (const label of mergeLabels) {
  mergeCalls += counter.calls.get(label) ?? 0;
}
let totalCalls = 0;
for (const calls of counter.calls.values()) {
  totalCalls += calls;
}
const unattributed = counter.calls.get(null) ?? 0;

const width = Math.max(
  ...rows.map((row) => row.label.length),
  'merge entries'.length
);
const format = (/** @type {number} */ n) => n.toLocaleString('en-US');
console.log(`${'entry'.padEnd(width)}  ${'calls'.padStart(10)}  distinct`);
for (const row of rows) {
  console.log(
    `${row.label.padEnd(width)}  ${format(row.calls).padStart(10)}  ${format(row.distinct)}`
  );
}
console.log(
  `${'merge entries'.padEnd(width)}  ${format(mergeCalls).padStart(10)}  ${format(mergeStrings.size)}`
);
console.log(
  `${'preset'.padEnd(width)}  ${format(totalCalls).padStart(10)}  ${format(everyString.size)}`
);
if (unattributed > 0) {
  console.log(`(${format(unattributed)} calls outside any entry)`);
}

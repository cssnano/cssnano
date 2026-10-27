// Prints the time each preset entry spends in its own listeners over the
// framework corpus, so a refactor can show where its time moved.
//
//   node util/pluginTiming.js [--preset default|lite|advanced] [--rounds <n>]
//
// Every listener of an entry is timed, so an entry's time excludes the other
// entries' listeners. The table shows, per entry, the fastest round, because
// the slowest rounds are mostly noise from the machine. A host plugin also
// lists the time of each of its stages, indented below it; those times are
// part of the host's and are not added to the total.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { repositoryFile } from './testHelpers.js';

/** @typedef {(this: unknown, ...args: unknown[]) => unknown} Listener */
/** @typedef {Record<string, unknown>} Plugin */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const cssnanoDir = join(root, 'packages', 'cssnano');
const frameworksDir = join(root, 'frameworks');

const { values } = parseArgs({
  options: {
    preset: { type: 'string', default: 'default' },
    rounds: { type: 'string', default: '3' },
  },
  strict: true,
});
const rounds = Number(values.rounds);
if (!Number.isSafeInteger(rounds) || rounds < 1) {
  console.error('--rounds must be a positive integer');
  process.exit(2);
}

const require = createRequire(join(cssnanoDir, 'package.json'));
const postcss = (await import(pathToFileURL(require.resolve('postcss')).href))
  .default;
const { default: preset } = await import(
  pathToFileURL(join(cssnanoDir, 'src', 'presets', `${values.preset}.js`)).href
);
const { configurePlugins } = await import(
  pathToFileURL(join(cssnanoDir, 'src', 'presets', 'configurePlugins.js')).href
);
const { presetEntriesKey } = await import(
  pathToFileURL(join(cssnanoDir, 'src', 'presets', 'presetEntries.js')).href
);

/**
 * Labels each plugin by its PostCSS name, and numbers repeats, so two entries
 * with the same name stay apart.
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
 * Accumulated nanoseconds per entry for the round in progress.
 * @type {Map<string, bigint>}
 */
let roundTotals = new Map();

/**
 * Accumulated nanoseconds per stage of a host plugin for the round in progress.
 * @type {Map<string, bigint>}
 */
let stageTotals = new Map();

/**
 * @template {unknown[]} Args
 * @template Result
 * @param {Map<string, bigint>} totals
 * @param {string} label
 * @param {(...args: Args) => Result} run
 * @return {(...args: Args) => Result}
 */
function addingTimeTo(totals, label, run) {
  return (...args) => {
    const start = process.hrtime.bigint();
    try {
      return run(...args);
    } finally {
      totals.set(
        label,
        (totals.get(label) ?? 0n) + process.hrtime.bigint() - start
      );
    }
  };
}

/**
 * A stage entry that times the reducers of the stages it creates.
 * A reducer keeps one wrapper, so plans still share.
 *
 * @param {{ create: Function }} entry
 * @param {string} name the preset option of the entry
 */
function timedEntry(entry, name) {
  return {
    create(/** @type {unknown[]} */ ...args) {
      const stage = entry.create(...args);
      if (stage === null) return null;
      /** @type {Map<Function, Function>} */
      const wrappers = new Map();
      const timedReducer = (/** @type {Function} */ reducer) => {
        if (!wrappers.has(reducer)) {
          wrappers.set(
            reducer,
            addingTimeTo(stageTotals, name, /** @type {any} */ (reducer))
          );
        }
        return wrappers.get(reducer);
      };
      const timedStage = {
        forProperty(/** @type {string} */ property) {
          const reducer = stage.forProperty?.(property) ?? null;
          return reducer === null ? null : timedReducer(reducer);
        },
        forAtRule(/** @type {string} */ atRuleName) {
          const part = stage.forAtRule?.(atRuleName) ?? null;
          if (part === null) return null;
          if (typeof part === 'function') return timedReducer(part);
          return {
            reduce: timedReducer(part.reduce),
            tightensAfterName: part.tightensAfterName,
          };
        },
      };
      // The walk tells a stage without a selector rewrite by its absence.
      if (stage.selector !== undefined) {
        timedStage.selector = timedReducer(stage.selector);
      }
      return timedStage;
    },
  };
}

/**
 * The plugins of the preset, with every stage timed under its entry name.
 * @return {Plugin[]}
 */
function pluginsWithTimedStages() {
  const entries = /** @type {any[][]} */ (preset[presetEntriesKey]).map(
    ([first, name, settings]) => [
      typeof first === 'function' ? first : timedEntry(first, name),
      name,
      settings,
    ]
  );
  return configurePlugins(entries, {});
}

/**
 * Wraps a listener so its run time is added to `label`.
 *
 * @param {string} label
 * @param {Listener} listener
 * @return {Listener}
 */
function timedListener(label, listener) {
  return function timedRun(...args) {
    const start = process.hrtime.bigint();
    try {
      return listener.apply(this, args);
    } finally {
      roundTotals.set(
        label,
        (roundTotals.get(label) ?? 0n) + process.hrtime.bigint() - start
      );
    }
  };
}

/**
 * Wraps every listener of a visitor object, including per-property ones such
 * as `Declaration: { color() {} }`.
 *
 * @param {Plugin} visitors
 * @param {string} label
 * @return {Plugin}
 */
function timedVisitors(visitors, label) {
  return Object.fromEntries(
    Object.entries(visitors).map(([name, listener]) => [
      name,
      typeof listener === 'function'
        ? timedListener(label, /** @type {Listener} */ (listener))
        : timedVisitors(/** @type {Plugin} */ (listener), label),
    ])
  );
}

/**
 * Copies a plugin so each of its listeners records its time under `label`.
 * A `prepare` hook returns the listeners for one run, so those are timed too.
 *
 * @param {Plugin} plugin
 * @param {string} label
 * @return {Plugin}
 */
function timed(plugin, label) {
  /** @type {Plugin} */
  const copy = { ...plugin };
  for (const [key, value] of Object.entries(plugin)) {
    if (typeof value !== 'function') continue;
    const listener = /** @type {Listener} */ (value);
    if (key === 'prepare') {
      copy[key] = /** @type {Listener} */ (
        function timedPrepare(...args) {
          const visitors = /** @type {Plugin | undefined} */ (
            timedListener(label, listener).apply(this, args)
          );
          return visitors === undefined || visitors === null
            ? visitors
            : timedVisitors(visitors, label);
        }
      );
    } else {
      copy[key] = timedListener(label, listener);
    }
  }
  return copy;
}

const files = readdirSync(frameworksDir)
  .toSorted()
  .map((file) => readFileSync(join(frameworksDir, file), 'utf8'));

/** @type {string[]} */
const labels = [];
/** @type {Map<string, bigint>} */
const best = new Map();
/** @type {Map<string, bigint>} */
const bestStage = new Map();
let wholeRunBest = Infinity;
for (let round = 0; round < rounds; round++) {
  roundTotals = new Map();
  stageTotals = new Map();
  const entries = labelled(pluginsWithTimedStages());
  for (const { label } of entries) {
    if (!labels.includes(label)) labels.push(label);
  }
  const plugins = entries.map(({ label, plugin }) => timed(plugin, label));
  const processor = postcss(plugins);
  const start = performance.now();
  for (const css of files) {
    await processor.process(css, { from: repositoryFile });
  }
  wholeRunBest = Math.min(wholeRunBest, performance.now() - start);
  for (const label of labels) {
    const total = roundTotals.get(label) ?? 0n;
    const previous = best.get(label);
    if (previous === undefined || total < previous) best.set(label, total);
  }
  for (const [name, total] of stageTotals) {
    const previous = bestStage.get(name);
    if (previous === undefined || total < previous) bestStage.set(name, total);
  }
}

const ms = (/** @type {bigint} */ ns) => Number(ns) / 1e6;
const sum = [...best.values()].reduce((a, b) => a + b, 0n);
const width = Math.max(...labels.map((label) => label.length), 'total'.length);
console.log(
  `${'entry'.padEnd(width)}  ${'ms'.padStart(10)}  ${'share'.padStart(7)}`
);
for (const label of labels) {
  const time = best.get(label) ?? 0n;
  const share = sum === 0n ? 0 : (Number(time) / Number(sum)) * 100;
  console.log(
    `${label.padEnd(width)}  ${ms(time).toFixed(1).padStart(10)}  ${`${share.toFixed(1)}%`.padStart(7)}`
  );
}
for (const [name, time] of bestStage) {
  console.log(
    `${`  ${name}`.padEnd(width)}  ${ms(time).toFixed(1).padStart(10)}`
  );
}
console.log(
  `${'total'.padEnd(width)}  ${ms(sum).toFixed(1).padStart(10)}  ${'100.0%'.padStart(7)}`
);
console.log(
  `wall time of the fastest round, all listeners included: ${wholeRunBest.toFixed(1)} ms (${rounds} rounds, ${files.length} files)`
);

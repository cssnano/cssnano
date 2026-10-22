import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import postcss from 'postcss';
import defaultPreset from '#presets/default';
import { configurePlugins } from '../../src/presets/configurePlugins.js';
import { browserTargets } from '../../src/utils/browserTargets.js';
import { hostPlugin } from '../../src/pipeline/host.js';

/** @typedef {import('../../src/presets/configurePlugins.js').PluginEntry} PluginEntry */

/**
 * A stage entry. Its create records the options it is built with, and its
 * stage logs the name of the entry each time it runs.
 *
 * @param {string} option
 * @param {{log: string[], built: {option: string, options: Record<PropertyKey, unknown>}[], targets?: true, returnsNull?: true}} state
 * @returns {PluginEntry}
 */
function stageEntry(option, { log, built, targets, returnsNull }) {
  return /** @type {PluginEntry} */ ([
    {
      create(/** @type {Record<PropertyKey, unknown>} */ options) {
        built.push({ option, options });
        if (returnsNull) return null;
        return {
          run() {
            log.push(option);
          },
        };
      },
    },
    option,
    {
      postcssPlugin: `postcss-${option}`,
      optionKeys: ['level'],
      ...(targets ? { targets } : undefined),
    },
  ]);
}

/**
 * A plugin creator entry, which is not a stage.
 * @param {string} option
 * @returns {PluginEntry}
 */
function creatorEntry(option) {
  return /** @type {PluginEntry} */ ([
    () => ({ postcssPlugin: `postcss-${option}` }),
    option,
    { postcssPlugin: `postcss-${option}`, optionKeys: [] },
  ]);
}

/** @returns {{log: string[], built: {option: string, options: Record<PropertyKey, unknown>}[]}} */
function state() {
  return { log: [], built: [] };
}

/**
 * @param {{log: string[]}} s the state that the stage entries log into
 * @param {PluginEntry[]} entries
 * @param {Record<string, unknown>} options
 * @returns {Promise<string[]>} the stages that ran, in order, over a stylesheet
 */
async function ranStages(s, entries, options) {
  await postcss(configurePlugins(entries, options)).process('a{}', {
    from: undefined,
  });
  return s.log;
}

describe('stage entries in a preset', () => {
  test('adjacent stage entries are configured as one host plugin', () => {
    const s = state();
    const names = configurePlugins(
      [stageEntry('a', s), stageEntry('b', s)],
      {}
    ).map((plugin) => plugin.postcssPlugin);
    assert.deepStrictEqual(names, ['cssnano-host']);
  });

  test('a plugin creator between two stage entries splits them into two host plugins', () => {
    const s = state();
    const names = configurePlugins(
      [stageEntry('a', s), creatorEntry('c'), stageEntry('b', s)],
      {}
    ).map((plugin) => plugin.postcssPlugin);
    assert.deepStrictEqual(names, [
      'cssnano-host',
      'postcss-c',
      'cssnano-host',
    ]);
  });

  test('a disabled plugin creator does not end the run of stage entries around it', () => {
    const s = state();
    const names = configurePlugins(
      [stageEntry('a', s), creatorEntry('c'), stageEntry('b', s)],
      { disable: ['c'] }
    ).map((plugin) => plugin.postcssPlugin);
    assert.deepStrictEqual(names, ['cssnano-host']);
  });

  test('disabling one stage leaves its neighbours running in order', async () => {
    const s = state();
    const entries = [
      stageEntry('a', s),
      stageEntry('b', s),
      stageEntry('c', s),
    ];
    assert.deepStrictEqual(await ranStages(s, entries, { disable: ['b'] }), [
      'a',
      'c',
    ]);
  });

  test('a run whose stages are all disabled configures no host plugin', () => {
    const s = state();
    const plugins = configurePlugins([stageEntry('a', s), stageEntry('b', s)], {
      disable: ['a', 'b'],
    });
    assert.deepStrictEqual(plugins, []);
  });

  test('a stage that builds nothing is left out of its run without ending it', async () => {
    const s = state();
    const entries = [
      stageEntry('a', s),
      stageEntry('none', { ...s, returnsNull: true }),
      stageEntry('b', s),
    ];
    assert.deepStrictEqual(await ranStages(s, entries, {}), ['a', 'b']);
  });

  test('options reach only the stage they name, merged over its defaults', async () => {
    const s = state();
    await ranStages(s, [stageEntry('a', s), stageEntry('b', s)], {
      options: { a: { level: 1 } },
    });
    const [first, second] = s.built;
    assert.equal(first.options.level, 1);
    assert.equal(second.options.level, undefined);
  });

  test('a stage receives the browser targets only when its entry reads them', async () => {
    const s = state();
    const browserslist = { query: 'defaults' };
    await ranStages(
      s,
      [stageEntry('reads', { ...s, targets: true }), stageEntry('ignores', s)],
      { browserslist }
    );
    const reads = s.built.find(({ option }) => option === 'reads');
    const ignores = s.built.find(({ option }) => option === 'ignores');
    assert.deepStrictEqual(reads?.options[browserTargets], browserslist);
    assert.equal(ignores?.options[browserTargets], undefined);
  });

  test('the default preset runs its stage entries in the place of minifyGradients, reduceInitial, normalizeDisplayValues, reduceTransforms, colormin, the timing functions, calc and convertValues, in one host plugin', () => {
    const names = defaultPreset().map((plugin) => plugin.postcssPlugin);
    const host = names.indexOf('cssnano-host');
    assert.notEqual(host, -1);
    assert.equal(names.lastIndexOf('cssnano-host'), host);
    assert.equal(names[host - 1], 'postcss-discard-comments');
    assert.equal(names[host + 1], 'postcss-ordered-values');
  });
});

/**
 * A stage entry that counts its creates and records the targets each one got.
 * @param {{count: number, targets: unknown[]}} calls
 */
const countingEntry = (calls) => ({
  create(/** @type {unknown} */ _options, /** @type {unknown} */ targets) {
    calls.count += 1;
    calls.targets.push(targets);
    return { run() {} };
  },
});

/**
 * A host member for an entry, with the targets flag the preset would set.
 * @param {{create: (options: Record<PropertyKey, unknown>, targets?: readonly string[]) => unknown}} entry
 * @param {{targets?: boolean, options?: Record<PropertyKey, unknown>}} [settings]
 */
const member = (entry, { targets = false, options = {} } = {}) => ({
  entry,
  options,
  targets,
});

describe('a host plugin creating its stages', () => {
  test('creates a stage that reads no targets once, when the plugin is configured', async () => {
    const calls = { count: 0, targets: [] };
    const host = hostPlugin([member(countingEntry(calls))]);
    assert.equal(calls.count, 1);
    const processor = postcss([host]);
    await processor.process('a{}', { from: undefined });
    await processor.process('b{}', { from: undefined });
    assert.equal(calls.count, 1);
    assert.equal(calls.targets[0], undefined);
  });

  test('creates a stage that reads targets once per targets array over several stylesheets', async () => {
    const calls = { count: 0, targets: [] };
    const processor = postcss([
      hostPlugin([member(countingEntry(calls), { targets: true })]),
    ]);
    await processor.process('a{}', { from: undefined });
    await processor.process('b{}', { from: undefined });
    assert.equal(calls.count, 1);
  });

  test('gives a stage that reads targets the same frozen targets for every stylesheet', async () => {
    const calls = { count: 0, targets: [] };
    const processor = postcss([
      hostPlugin([member(countingEntry(calls), { targets: true })]),
    ]);
    await processor.process('a{}', { from: undefined });
    await processor.process('b{}', { from: undefined });
    assert.ok(Object.isFrozen(calls.targets[0]));
  });

  test('creates each stage of a host separately, even for entries given the same options', async () => {
    const first = { count: 0, targets: [] };
    const second = { count: 0, targets: [] };
    const options = {};
    postcss([
      hostPlugin([
        member(countingEntry(first), { options }),
        member(countingEntry(second), { options }),
      ]),
    ]);
    assert.equal(first.count, 1);
    assert.equal(second.count, 1);
  });

  test('creates a stage again for a host configured with other options', async () => {
    const calls = { count: 0, targets: [] };
    const entry = countingEntry(calls);
    hostPlugin([member(entry)]);
    hostPlugin([member(entry)]);
    assert.equal(calls.count, 2);
  });
});

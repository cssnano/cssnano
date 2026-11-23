import postcss from 'postcss';
import assert from 'node:assert/strict';
import { hostPlugin } from '../packages/cssnano/src/run/host.js';
import { hostPlan } from '../packages/cssnano/src/run/hostPlan.js';
import { configureValidated } from '../packages/cssnano/src/presets/configurePlugins.js';
import { advancedPresetEntries } from '../packages/cssnano/src/presets/advancedPlugins.js';
import { normalizeWhitespaceEntry } from '../packages/cssnano/src/presets/sharedPluginEntries.js';
import { defaultPluginEntries } from '../packages/cssnano/src/presets/defaultPlugins.js';

/**
 * The browser targets as the `browserslist` option of a preset, so that tests
 * pass the same shape a user writes. The query, env and stats are the ones
 * browserslist takes; unset ones are left to browserslist.
 *
 * @param {string | string[]} [query]
 * @param {{env?: string, stats?: unknown}} [settings]
 * @returns {{browserslist: {query: string | string[] | undefined, env: string | undefined, stats: unknown}}}
 */
export function withTargets(query, { env, stats } = {}) {
  return { browserslist: { query, env, stats } };
}

/**
 * The browser targets the test suites use when a test names none. The legacy
 * targets keep the support-dependent fallbacks under test.
 */
export const testTargets = 'ie 11';

/**
 * The test targets as plugin options, which every plugin a test creates shares.
 */
const testTargetOptions = withTargets(testTargets);

/**
 * Adds the test targets to plugin options that name no targets and no config
 * file. A test that names its own config is left to discover it.
 *
 * @param {object} [options]
 * @returns {object | undefined}
 */
function withTestTargets(options) {
  if (
    options?.browserslist !== undefined ||
    options?.from !== undefined ||
    options?.file !== undefined
  ) {
    return options;
  }
  return { ...options, ...testTargetOptions };
}

/**
 * Splits the browser targets from the test plugin options, which a run plan
 * takes instead, so that a stage never sees the browserslist key.
 *
 * @param {object} [options]
 * @returns {{browserslist: import('../packages/cssnano/src/utils/browserTargets.js').SharedTargets | undefined, options: object}}
 */
export function splitTargets(options = {}) {
  const { browserslist, ...rest } = withTestTargets(options) ?? {};
  return { browserslist, options: rest };
}

/**
 * Process options without a file, so PostCSS does not warn. A named `from`
 * or `file` is kept.
 *
 * @param {object} [options]
 */
function withoutConfigFile(options) {
  return { from: undefined, ...options };
}

function usePostCSSPlugin(plugin) {
  return () => {
    assert.ok(plugin.postcssPlugin);
  };
}

function processCSSFactory(plugin) {
  let processor;

  if (Array.isArray(plugin)) {
    const postcssProcessor = postcss(plugin);
    processor = (fixture, options) =>
      postcssProcessor.process(fixture, withoutConfigFile(options));
  } else {
    processor = (fixture, options) =>
      postcss(plugin(withTestTargets(options))).process(
        fixture,
        withoutConfigFile(options)
      );
  }

  const processCSS = (fixture, expected, options) => {
    return async () => {
      const result = await processor(fixture, options);
      assert.strictEqual(result.css, expected);
      return result;
    };
  };

  const passthroughCSS = (fixture, options) => {
    return processCSS(fixture, fixture, options);
  };

  return { processor, processCSS, passthroughCSS };
}

/**
 * A PostCSS plugin creator that runs one stage entry, the way a preset does: the
 * stage is built for each run in a host plugin of its own. The browser targets
 * are resolved for every stage, so a stage that ignores them is built once per
 * targets array, which changes nothing it outputs.
 *
 * @param {import('../packages/cssnano/src/run/host.js').StageEntry} entry
 */
function oneStagePlugin(entry) {
  return (options = {}) => {
    const split = splitTargets(options);
    return hostPlugin(
      hostPlan({
        browserslist: split.browserslist,
        members: [{ entry, options: split.options, targets: true }],
      })
    );
  };
}

/**
 * The plugins that normalizeWhitespace runs in a preset: its value stage and the
 * walk's option for it in one host, then its raws plugin.
 *
 * @returns {import('postcss').AcceptedPlugin[]}
 */
function normalizeWhitespacePlugins() {
  return configureValidated([normalizeWhitespaceEntry], {
    browserslist: { query: testTargets },
  });
}

/**
 * The plugins that the default preset runs for discardOverridden: its walk
 * transform, in a host of its own.
 *
 * @returns {import('postcss').AcceptedPlugin[]}
 */
function discardOverriddenPlugins() {
  return configureValidated(
    defaultPluginEntries.filter(([, name]) => name === 'discardOverridden'),
    { browserslist: { query: testTargets } }
  );
}

/**
 * A PostCSS plugin creator that runs one plugin of the advanced preset, the
 * way the preset does: its entry alone, in a host, with the options the caller
 * passes under the plugin's preset option name. PostCSS calls the creator once,
 * when it is added to a processor, as it does for a standalone plugin creator.
 *
 * @param {string} optionName the preset option of the plugin, such as `zindex`
 * @returns {((options?: object) => import('postcss').Plugin) & {postcss: true}}
 */
function presetEntryPlugin(optionName) {
  const entries = advancedPresetEntries.filter(
    ([, name]) => name === optionName
  );
  assert.equal(entries.length, 1, `no preset entry named ${optionName}`);
  /** @param {object} [options] */
  const creator = (options = {}) => {
    const { browserslist = { query: testTargets }, ...pluginOptions } =
      /** @type {{browserslist?: object}} */ (options);
    const plugins = configureValidated(entries, {
      browserslist,
      options: { [optionName]: pluginOptions },
    });
    assert.equal(plugins.length, 1, `${optionName} is off`);
    return /** @type {import('postcss').Plugin} */ (plugins[0]);
  };
  creator.postcss = /** @type {const} */ (true);
  return creator;
}

export {
  oneStagePlugin,
  usePostCSSPlugin,
  processCSSFactory,
  normalizeWhitespacePlugins,
  discardOverriddenPlugins,
  presetEntryPlugin,
};

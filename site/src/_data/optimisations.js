/** @import {PresetId} from './presets.js' */

import advancedPreset from '../../../packages/cssnano/src/presets/advanced.js';
import defaultPreset from '../../../packages/cssnano/src/presets/default.js';
import litePreset from '../../../packages/cssnano/src/presets/lite.js';
import {
  pluginNameByOption,
  presetEntriesKey,
} from '../../../packages/cssnano/src/presets/presetEntries.js';
import { editorialOptimisations } from './editorialOptimisations.js';

/**
 * @typedef {object} Optimisation
 * @property {string} plugin Plugin identifier.
 * @property {string} shortName Display identifier.
 * @property {string} shortDescription Display name.
 * @property {string} longDescription
 * @property {string} inputExample
 * @property {string} outputExample
 * @property {string} [safe] Reason this optimisation may be unsafe.
 * @property {string} [option] Preset option that enables the plugin.
 * @property {PresetId[]} presets
 */

/** @typedef {Omit<Optimisation, 'presets'>} EditorialOptimisation */

/**
 * The [preset option, PostCSS plugin name] pairs that a preset runs.
 * @param {{[presetEntriesKey]: readonly (readonly [unknown, string, unknown])[]}} preset
 * @returns {[string, string][]}
 */
function pluginNamesOf(preset) {
  return preset[presetEntriesKey].map(([, option]) => [
    option,
    pluginNameByOption[option],
  ]);
}

function matchPluginsWithPresets() {
  /** @type {Record<PresetId, [string, string][]>} */
  const pluginsByPreset = {
    default: pluginNamesOf(defaultPreset),
    lite: pluginNamesOf(litePreset),
    advanced: pluginNamesOf(advancedPreset),
  };
  const internalPlugins = new Set(['cssnano-util-raw-cache']);
  const optionByPlugin = new Map(
    Object.values(pluginsByPreset)
      .flat()
      .map(([option, plugin]) => [plugin, option])
  );
  const presetPlugins = Object.fromEntries(
    Object.entries(pluginsByPreset).map(([preset, pairs]) => [
      preset,
      new Set(pairs.map(([, plugin]) => plugin)),
    ])
  );
  const documentedPlugins = new Set(
    editorialOptimisations.map((optimisation) => optimisation.plugin)
  );
  const undocumentedPlugins = [
    ...new Set(Object.values(presetPlugins).flatMap((plugins) => [...plugins])),
  ].filter(
    (plugin) => !internalPlugins.has(plugin) && !documentedPlugins.has(plugin)
  );

  if (undocumentedPlugins.length > 0) {
    throw new Error(
      `Missing optimisation documentation for: ${undocumentedPlugins.toSorted().join(', ')}`
    );
  }

  const optimisations = editorialOptimisations.map((optimisation) => ({
    ...optimisation,
    option: optionByPlugin.get(optimisation.plugin),
    presets: Object.entries(presetPlugins)
      .filter(([, plugins]) => plugins.has(optimisation.plugin))
      .map(([preset]) => preset),
  }));

  return optimisations;
}

const optimisations = matchPluginsWithPresets();

export default optimisations;

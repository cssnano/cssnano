/** @import {PresetId} from './presets.js' */

import advancedPreset from '../../../packages/cssnano/src/presets/advanced.js';
import defaultPreset from '../../../packages/cssnano/src/presets/default.js';
import litePreset from '../../../packages/cssnano/src/presets/lite.js';
import pluginName from '../../util/pluginName.js';
import { enabledPlugins } from '../utils/enabledPlugins.js';
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
 * @property {PresetId[]} presets
 */

/** @typedef {Omit<Optimisation, 'presets'>} EditorialOptimisation */

function matchPluginsWithPresets() {
  const presetModules = {
    default: defaultPreset,
    lite: litePreset,
    advanced: advancedPreset,
  };
  const internalPlugins = new Set(['cssnano-util-raw-cache']);
  const presetPlugins = Object.fromEntries(
    Object.entries(presetModules).map(([preset, presetModule]) => [
      preset,
      new Set(
        enabledPlugins(presetModule).map(([plugin]) => pluginName(plugin))
      ),
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
    presets: Object.entries(presetPlugins)
      .filter(([, plugins]) => plugins.has(optimisation.plugin))
      .map(([preset]) => preset),
  }));

  return optimisations;
}

const optimisations = matchPluginsWithPresets();

export default optimisations;

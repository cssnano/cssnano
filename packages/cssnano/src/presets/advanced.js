import { definePreset } from './configurePlugins.js';
import { advancedPresetEntries } from './advancedPlugins.js';

/** @import {NamedPreset} from './presetEntries.js' */
/** @import {AdvancedPluginOptions} from './advancedPlugins.js' */

/** @typedef {import('./configurePlugins.js').PresetOptions<AdvancedPluginOptions>} PresetOptions */

/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 * @type {NamedPreset<'advanced', AdvancedPluginOptions>}
 */
const advancedPreset = definePreset('advanced', advancedPresetEntries);

export { advancedPreset as default, advancedPreset as 'module.exports' };

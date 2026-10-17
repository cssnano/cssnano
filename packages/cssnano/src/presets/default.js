import { definePreset } from './configurePlugins.js';
import { defaultPluginEntries } from './defaultPlugins.js';

/** @import {NamedPreset} from './presetEntries.js' */
/** @import {DefaultPluginOptions} from './defaultPlugins.js' */

/** @typedef {import('./configurePlugins.js').PresetOptions<DefaultPluginOptions>} PresetOptions */

/**
 * Safe defaults for cssnano which require minimal configuration
 * @type {NamedPreset<'default', DefaultPluginOptions>}
 */
const defaultPreset = definePreset('default', defaultPluginEntries);

export { defaultPreset as default, defaultPreset as 'module.exports' };

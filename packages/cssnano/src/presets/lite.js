import { definePreset } from './configurePlugins.js';
import { litePluginEntries } from './litePlugins.js';

/** @import {NamedPreset} from './presetEntries.js' */
/** @import {LitePluginOptions} from './litePlugins.js' */

/** @typedef {import('./configurePlugins.js').PresetOptions<LitePluginOptions>} PresetOptions */

/**
 * Safe and minimum transformation with just removing whitespaces, line breaks and comments
 * @type {NamedPreset<'lite', LitePluginOptions>}
 */
const litePreset = definePreset('lite', litePluginEntries);

export { litePreset as default, litePreset as 'module.exports' };

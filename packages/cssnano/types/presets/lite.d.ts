import type { NamedPreset } from './presetEntries.js';
import type { LitePluginOptions } from './litePlugins.js';
export type PresetOptions = import('./configurePlugins.js').PresetOptions<LitePluginOptions>;
/** @import {NamedPreset} from './presetEntries.js' */
/** @import {LitePluginOptions} from './litePlugins.js' */
/** @typedef {import('./configurePlugins.js').PresetOptions<LitePluginOptions>} PresetOptions */
/**
 * Safe and minimum transformation with just removing whitespaces, line breaks and comments
 * @type {NamedPreset<'lite', LitePluginOptions>}
 */
declare const litePreset: NamedPreset<'lite', LitePluginOptions>;
export { litePreset as default, litePreset as 'module.exports' };
//# sourceMappingURL=lite.d.ts.map
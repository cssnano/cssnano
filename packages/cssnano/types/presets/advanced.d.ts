import type { NamedPreset } from './presetEntries.js';
import type { AdvancedPluginOptions } from './advancedPlugins.js';
export type PresetOptions = import('./configurePlugins.js').PresetOptions<AdvancedPluginOptions>;
/** @import {NamedPreset} from './presetEntries.js' */
/** @import {AdvancedPluginOptions} from './advancedPlugins.js' */
/** @typedef {import('./configurePlugins.js').PresetOptions<AdvancedPluginOptions>} PresetOptions */
/**
 * Advanced optimisations for cssnano; may or may not break your CSS!
 * @type {NamedPreset<'advanced', AdvancedPluginOptions>}
 */
declare const advancedPreset: NamedPreset<'advanced', AdvancedPluginOptions>;
export { advancedPreset as default, advancedPreset as 'module.exports' };
//# sourceMappingURL=advanced.d.ts.map
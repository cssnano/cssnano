import type { NamedPreset } from './presetEntries.js';
import type { DefaultPluginOptions } from './defaultPlugins.js';
export type PresetOptions = import('./configurePlugins.js').PresetOptions<DefaultPluginOptions>;
/** @import {NamedPreset} from './presetEntries.js' */
/** @import {DefaultPluginOptions} from './defaultPlugins.js' */
/** @typedef {import('./configurePlugins.js').PresetOptions<DefaultPluginOptions>} PresetOptions */
/**
 * Safe defaults for cssnano which require minimal configuration
 * @type {NamedPreset<'default', DefaultPluginOptions>}
 */
declare const defaultPreset: NamedPreset<'default', DefaultPluginOptions>;
export { defaultPreset as default, defaultPreset as 'module.exports' };
//# sourceMappingURL=default.d.ts.map
import type { NamedPreset } from './presets/presetEntries.js';
import type { PresetOptions } from './presets/configurePlugins.js';
import type { DefaultPluginOptions } from './presets/defaultPlugins.js';
import type { LitePluginOptions } from './presets/litePlugins.js';
import type { AdvancedPluginOptions } from './presets/advancedPlugins.js';
import type { AcceptedPlugin } from 'postcss';
import type { SharedTargets } from '#utils/browser-targets';
export type ConfiguredPreset<Name extends string, Plugins extends object> = {
    preset: NamedPreset<Name, Plugins>;
} & Pick<PresetOptions<Plugins>, 'disable' | 'options'>;
export type Config = {
    browserslist?: SharedTargets;
} & (ConfiguredPreset<'default', DefaultPluginOptions> | ConfiguredPreset<'lite', LitePluginOptions> | ConfiguredPreset<'advanced', AdvancedPluginOptions> | ({
    preset?: undefined;
} & Pick<PresetOptions<DefaultPluginOptions>, 'disable' | 'options'>));
export type Options = {
    configFile?: string;
} & Config;
/**
 * Validates options that are inline or in a configuration file. Without a
 * preset, the default preset runs, so its plugins are the ones that disable
 * and options may name. A preset that is not built in throws, because running
 * another preset would change the output the user asked for.
 *
 * @param {Record<string, unknown>} input
 * @param {'inline' | 'file'} place
 * @returns {Record<string, unknown>}
 */
export declare function validateConfig(input: Record<string, unknown>, place: 'inline' | 'file'): Record<string, unknown>;
/**
 * Turns cssnano options into the plugins to run. Inline options replace the
 * configuration file, which is then not read, so browserslist sees one
 * consistent set of keys. Otherwise the configuration file named by configFile
 * is read, or else cssnano.config.js in the working directory. With neither,
 * cssnano runs the default preset.
 *
 * @param {Options} options
 * @returns {AcceptedPlugin[]}
 */
export declare function resolveOptions(options: Options): AcceptedPlugin[];
//# sourceMappingURL=config.d.ts.map
import type { AcceptedPlugin } from 'postcss';
import type { NamedPreset } from './presetEntries.js';
import type { SharedTargets } from '#utils/browser-targets';
export type PresetOptions<Plugins extends object> = {
    browserslist?: SharedTargets;
    /**
     * plugins to leave out
     */
    disable?: readonly (keyof Plugins)[];
    /**
     * plugin name to the options that
     * are merged over the plugin's defaults
     */
    options?: { [Name in keyof Plugins]?: Plugins[Name]; };
};
export type TransformSettings = {
    name: string;
    /**
     * the transform reads the browser targets of its preset
     */
    targets?: true;
    /**
     * options the transform uses unless the preset sets them
     */
    defaults?: object;
    /**
     * the options the transform accepts
     */
    optionKeys: readonly string[];
};
export type PluginEntrySettings = {
    postcssPlugin: string;
    transforms?: undefined;
    targets?: true;
    defaults?: object;
    optionKeys: readonly string[];
} | {
    postcssPlugin: string;
    transforms: readonly TransformSettings[];
};
export type PluginCreator = import('postcss').PluginCreator<any>;
export type PluginEntry = readonly [PluginCreator, string, PluginEntrySettings];
/** @import {AcceptedPlugin} from 'postcss' */
/** @import {NamedPreset} from './presetEntries.js' */
/** @import {SharedTargets} from '#utils/browser-targets' */
/**
 * The options of a built preset: the same as cssnano, without the preset and
 * the configuration file.
 * @template {object} Plugins the options of each plugin the preset runs, keyed by its preset option
 * @typedef {object} PresetOptions
 * @property {SharedTargets} [browserslist]
 * @property {readonly (keyof Plugins)[]} [disable] plugins to leave out
 * @property {{[Name in keyof Plugins]?: Plugins[Name]}} [options] plugin name to the options that
 *   are merged over the plugin's defaults
 */
/**
 * A transform in a preset: the name that `disable` and `options` use, and
 * its settings. A plugin entry with no list hosts one transform, named by its
 * own option name.
 *
 * `targets` is set when the transform reads the browser targets; `defaults`
 * are the options it uses unless the preset sets them; `optionKeys` lists the
 * options it accepts, so a key it does not declare can be reported.
 *
 * @typedef {object} TransformSettings
 * @property {string} name
 * @property {true} [targets] the transform reads the browser targets of its preset
 * @property {object} [defaults] options the transform uses unless the preset sets them
 * @property {readonly string[]} optionKeys the options the transform accepts
 */
/**
 * A plugin in a preset: the PostCSS creator, the name of the entry, and its
 * settings. An entry with `transforms` runs them in one PostCSS plugin, which
 * reports `postcssPlugin`. Its transforms are configured by name, and the
 * entry's own name is not an option.
 *
 * @typedef {{
 *   postcssPlugin: string,
 *   transforms?: undefined,
 *   targets?: true,
 *   defaults?: object,
 *   optionKeys: readonly string[],
 * } | {
 *   postcssPlugin: string,
 *   transforms: readonly TransformSettings[],
 * }} PluginEntrySettings
 */
/**
 * @typedef {import('postcss').PluginCreator<any>} PluginCreator
 */
/**
 * A plugin in a preset, the preset option that enables it, and its settings.
 * @typedef {readonly [PluginCreator, string, PluginEntrySettings]} PluginEntry
 */
/**
 * Turns the options of a built preset into the plugins it runs. A disabled
 * plugin is left out. Options that the preset does not take throw.
 *
 * @param {readonly PluginEntry[]} entries
 * @param {Record<string, unknown>} options
 * @returns {AcceptedPlugin[]}
 */
export declare function configurePlugins(entries: readonly PluginEntry[], options: Record<string, unknown>): AcceptedPlugin[];
/**
 * The same as configurePlugins, for options that validateOptions has already
 * checked against these entries, so the caller does not validate them twice.
 *
 * @param {readonly PluginEntry[]} entries
 * @param {Record<string, unknown>} known the validated options, without preset
 * @returns {AcceptedPlugin[]}
 */
export declare function configureValidated(entries: readonly PluginEntry[], known: Record<string, unknown>): AcceptedPlugin[];
/**
 * Builds a built-in preset function, tagged with its name and the plugins it
 * runs, so cssnano can read them from the function the user imported. The
 * caller's type annotation supplies the options of each plugin.
 *
 * @template {string} Name
 * @template {object} Plugins
 * @param {Name} name
 * @param {readonly PluginEntry[]} entries
 * @returns {NamedPreset<Name, Plugins>}
 */
export declare function definePreset<Name extends string, Plugins extends object>(name: Name, entries: readonly PluginEntry[]): NamedPreset<Name, Plugins>;
//# sourceMappingURL=configurePlugins.d.ts.map
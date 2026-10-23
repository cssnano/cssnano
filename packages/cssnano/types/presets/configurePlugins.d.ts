import type { AcceptedPlugin } from 'postcss';
import type { NamedPreset } from './presetEntries.js';
import type { SharedTargets } from '#utils/browser-targets';
import type { Guard } from '../optionGuards.js';
import type { StageEntry, HostMember, PassRun, TransformEntry } from '../pipeline/host.js';
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
export type PluginEntrySettings = {
    postcssPlugin: string;
    targets?: true;
    defaults?: object;
    optionKeys: readonly string[];
    guards?: Readonly<Record<string, Guard>>;
    stage?: StageEntry;
    walk?: true;
    transform?: true;
    pass?: PassRun['pass'];
};
export type PluginCreator = import('postcss').PluginCreator<any>;
export type PluginEntry = readonly [PluginCreator | StageEntry | TransformEntry, string, PluginEntrySettings];
export type Run = {
    members: HostMember[];
    transforms: Map<string, Record<PropertyKey, unknown>>;
    passes: Map<string, PassRun>;
};
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
 * Each run of adjacent enabled stage entries becomes one host plugin, which
 * builds its stages as it processes a stylesheet. A plugin creator that runs
 * ends the run, so the stages keep their order.
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
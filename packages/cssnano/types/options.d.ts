import type { PluginEntry } from './presets/configurePlugins.js';
import type { BuiltInPreset } from './presets/presetEntries.js';
export type Place = 'inline' | 'file' | 'preset';
/**
 * Whether validated options set something that replaces the configuration
 * file: any option with a value, other than configFile. Validation has already
 * dropped absent entries, so a plugin option written as undefined sets nothing.
 *
 * @param {Record<string, unknown>} options the validated options
 * @returns {boolean}
 */
export declare function hasInlineOption(options: Record<string, unknown>): boolean;
/**
 * Checks the preset before the other options, because the preset decides which
 * plugins they are checked against. A preset is a function imported from
 * cssnano, so a preset name, an array or a JSON value is rejected.
 *
 * @param {unknown} value the preset as the user wrote it
 * @returns {BuiltInPreset | undefined} the preset, or undefined when it is absent
 */
export declare function presetOf(value: unknown): BuiltInPreset | undefined;
/**
 * Validates the options of one place. A key whose value is null or undefined
 * is absent. Anything else that cssnano does not know throws, because ignoring
 * it would run something other than what the user asked for. A plugin name
 * counts only when the preset that runs it has the plugin.
 *
 * @param {Record<string, unknown>} input the options as the user wrote them
 * @param {Place} place where the options are written
 * @param {readonly PluginEntry[]} entries the plugins of the preset that runs
 * @returns {Record<string, unknown>} the validated options
 */
export declare function validateOptions(input: Record<string, unknown>, place: Place, entries: readonly PluginEntry[]): Record<string, unknown>;
//# sourceMappingURL=options.d.ts.map
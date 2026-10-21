import type { defaultPluginEntries } from '../../types/presets/defaultPlugins.js';
import type { litePluginEntries } from '../../types/presets/litePlugins.js';
import type {
  AdvancedPluginOptions,
  advancedPluginEntries,
} from '../../types/presets/advancedPlugins.js';
import type { DefaultPluginOptions } from '../../types/presets/defaultPlugins.js';
import type { LitePluginOptions } from '../../types/presets/litePlugins.js';
import type { advancedOnlyPluginNames } from '../../types/presets/presetEntries.js';

// Each entry's optionKeys must name exactly the keys of its plugin's options
// type, so unknown-key reports cannot drift from the plugins.
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type OptionKeysOf<Creator> = Creator extends (...args: infer Args) => unknown
  ? Args extends []
    ? never
    : keyof NonNullable<Args[0]>
  : never;

/** The named keys of an options type; `Record<string, never>` takes none. */
type NamedKeysOf<Options> = string extends keyof Options
  ? never
  : keyof Options;

/**
 * The names of the transforms whose optionKeys differ from their preset
 * option type. A transform has no creator of its own, so its preset option
 * documents its options.
 */
type DriftedTransform<Transform> = Transform extends {
  readonly name: infer Name;
  readonly optionKeys: readonly (infer Key)[];
}
  ? Name extends keyof AdvancedPluginOptions
    ? Equal<
        Key,
        NamedKeysOf<NonNullable<AdvancedPluginOptions[Name]>>
      > extends true
      ? never
      : Name
    : Name
  : never;

/**
 * The names of the entries or transforms whose optionKeys differ from their
 * options type. An entry of any other shape is reported, so that no entry
 * escapes the check.
 */
type Drifted<Entry> = Entry extends readonly [
  unknown,
  unknown,
  { readonly transforms: readonly (infer Transform)[] },
]
  ? DriftedTransform<Transform>
  : Entry extends readonly [
        infer Creator,
        infer Name,
        { readonly optionKeys: readonly (infer Key)[] },
      ]
    ? Equal<Key, OptionKeysOf<Creator>> extends true
      ? never
      : Name
    : Entry extends readonly [unknown, infer Name, unknown]
      ? Name
      : Entry;

/**
 * The preset options an entry answers to: its transforms' names when it
 * hosts transforms, and its own name otherwise.
 */
type PresetOptionName<Entry> = Entry extends readonly [
  unknown,
  unknown,
  { readonly transforms: readonly { readonly name: infer Name }[] },
]
  ? Name
  : Entry extends readonly [unknown, infer Name, unknown]
    ? Name
    : never;

type Entries =
  | (typeof defaultPluginEntries)[number]
  | (typeof litePluginEntries)[number]
  | (typeof advancedPluginEntries)[number];

const noDrift: [Drifted<Entries>] extends [never] ? true : Drifted<Entries> =
  true;
void noDrift;

// Each preset's documented option keys must name exactly the plugins it runs,
// so a plugin added to a preset is documented before it ships.
const defaultKeysMatch: Equal<
  keyof DefaultPluginOptions,
  PresetOptionName<(typeof defaultPluginEntries)[number]>
> = true;
const liteKeysMatch: Equal<
  keyof LitePluginOptions,
  PresetOptionName<(typeof litePluginEntries)[number]>
> = true;
const advancedKeysMatch: Equal<
  keyof AdvancedPluginOptions,
  PresetOptionName<
    | (typeof defaultPluginEntries)[number]
    | (typeof advancedPluginEntries)[number]
  >
> = true;
void [defaultKeysMatch, liteKeysMatch, advancedKeysMatch];

// The advanced-only names that options.js reports without loading the advanced
// preset must be the advanced entries that the default preset does not run.
const advancedOnlyNamesMatch: Equal<
  (typeof advancedOnlyPluginNames)[number],
  (typeof advancedPluginEntries)[number][1]
> = true;
void advancedOnlyNamesMatch;

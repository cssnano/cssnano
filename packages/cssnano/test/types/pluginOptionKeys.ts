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

/** The names of the entries whose optionKeys differ from their options type. */
type Drifted<Entry> = Entry extends readonly [
  infer Creator,
  infer Name,
  { readonly optionKeys: readonly (infer Key)[] },
]
  ? Equal<Key, OptionKeysOf<Creator>> extends true
    ? never
    : Name
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
  (typeof defaultPluginEntries)[number][1]
> = true;
const liteKeysMatch: Equal<
  keyof LitePluginOptions,
  (typeof litePluginEntries)[number][1]
> = true;
const advancedKeysMatch: Equal<
  keyof AdvancedPluginOptions,
  | (typeof defaultPluginEntries)[number][1]
  | (typeof advancedPluginEntries)[number][1]
> = true;
void [defaultKeysMatch, liteKeysMatch, advancedKeysMatch];

// The advanced-only names that options.js reports without loading the advanced
// preset must be the advanced entries that the default preset does not run.
const advancedOnlyNamesMatch: Equal<
  (typeof advancedOnlyPluginNames)[number],
  (typeof advancedPluginEntries)[number][1]
> = true;
void advancedOnlyNamesMatch;

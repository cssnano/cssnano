import cssnano, { type Config, type Options } from 'cssnano';
import advancedPreset from 'cssnano/presets/advanced';
import defaultPreset from 'cssnano/presets/default';
import litePreset from 'cssnano/presets/lite';

// Accepted configurations, checked by the compiler without running them.
const emptyOptions: Options = {};
const liteOnly: Config = { preset: litePreset };
const withOptions: Config = {
  preset: advancedPreset,
  disable: ['zindex'],
  options: { discardComments: { removeAll: true } },
  browserslist: { query: 'defaults', env: 'production' },
};
const configFile: Options = { configFile: 'cssnano.config.js' };
// Inline plugin names are accepted with the inline preset that names their plugins.
const presetWithNames: Options = {
  preset: advancedPreset,
  disable: ['zindex'],
};
const configuredProcessor = cssnano({ preset: litePreset });
// A built preset is a list of plugins, which the PostCSS configuration takes.
const composed = [litePreset({ disable: ['discardComments'] })];
void [
  emptyOptions,
  liteOnly,
  withOptions,
  configFile,
  presetWithNames,
  configuredProcessor,
  composed,
];

// Rejected configurations: each line must fail to compile.
// @ts-expect-error a preset is imported, so a preset name string is not one
const unknownName: Config = { preset: 'avanced' };
// @ts-expect-error a preset is imported, so a name string is rejected even when it is built in
const namedPreset: Options = { preset: 'lite' };
// @ts-expect-error a preset is a function, not an array of a name and options
const presetArray: Config = { preset: ['lite', { discardComments: false }] };
// @ts-expect-error plugins are configured in PostCSS, not in cssnano
const pluginsOption: Options = { plugins: [] };
// @ts-expect-error a configuration file cannot chain to another file
const chainedFile: Config = { configFile: 'other.js' };
// @ts-expect-error svgo is run before cssnano, not configured through it
const svgoOption: Config = { svgo: false };
// @ts-expect-error a built preset is a plugin list, not a preset function
const presetBuilt: Config = { preset: litePreset() };
// Browser targets need no preset, because the default preset runs without one.
const browserslistWithoutPreset: Options = {
  browserslist: { query: 'defaults' },
};
// Without a preset, the default preset runs, so disable and options name its plugins.
const optionsWithoutPreset: Options = {
  options: { discardComments: { removeAll: true } },
};
const disableWithoutPreset: Options = { disable: ['colormin'] };
void [browserslistWithoutPreset, optionsWithoutPreset, disableWithoutPreset];
// @ts-expect-error zindex is an advanced plugin, which the default preset run without a preset lacks
const fileWithoutPreset: Config = { disable: ['zindex'] };
// @ts-expect-error inline options without a preset cannot configure an advanced plugin
const inlineWithoutPreset: Options = { options: { zindex: { startIndex: 5 } } };

// Options are typed for the chosen preset, so the names of another preset are rejected.
// @ts-expect-error zindex is an advanced plugin, so the lite preset cannot disable it
const liteDisablesAdvanced: Config = {
  preset: litePreset,
  disable: ['zindex'],
};
const liteConfiguresAdvanced: Config = {
  preset: litePreset,
  // @ts-expect-error zindex is an advanced plugin, so the lite preset cannot configure it
  options: { zindex: { startIndex: 5 } },
};
const misspelledDisable: Config = {
  preset: advancedPreset,
  // @ts-expect-error a misspelled plugin name is rejected for the chosen preset
  disable: ['colormn'],
};
// @ts-expect-error a plugin of the advanced preset is not one the default preset runs
const defaultDisablesZindex: Config = {
  preset: defaultPreset,
  disable: ['zindex'],
};
const liteConfigures: Config = {
  preset: litePreset,
  options: { discardComments: { removeAll: true } },
};
void [liteConfigures];

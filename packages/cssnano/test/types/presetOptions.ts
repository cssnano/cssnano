import type { PresetOptions as DefaultPresetOptions } from 'cssnano/presets/default';
import type { PresetOptions as LitePresetOptions } from 'cssnano/presets/lite';
import type { PresetOptions as AdvancedPresetOptions } from 'cssnano/presets/advanced';
import defaultPreset from 'cssnano/presets/default';

// Each preset takes the same options: browser targets, disable and plugin options.
const everyKey: DefaultPresetOptions = {
  browserslist: {
    query: ['defaults', 'last 2 versions'],
    env: 'production',
    stats: { 'chunk.css': { '.a': 1 } },
    path: '/project/src',
    config: './browsers.rc',
    ignoreUnknownVersions: true,
    mobileToDesktop: false,
    throwOnMissing: true,
  },
  disable: ['mergeLonghand'],
  options: {
    discardComments: { removeAll: true },
    colormin: { hex: false },
  },
};
const liteKey: LitePresetOptions = { browserslist: { query: 'defaults' } };
const advancedKey: AdvancedPresetOptions = { disable: ['zindex'] };
const statsFile: DefaultPresetOptions = {
  browserslist: { stats: 'stats.json' },
};
// A Can I Use export wraps the usage in dataByBrowser, as validation accepts it.
const statsExport: DefaultPresetOptions = {
  browserslist: { stats: { dataByBrowser: { chrome: { '100': 0.5 } } } },
};
const queryString: DefaultPresetOptions = {
  browserslist: { query: 'defaults' },
};
const emptyOptions: DefaultPresetOptions = {};
void [
  everyKey,
  liteKey,
  advancedKey,
  statsFile,
  statsExport,
  queryString,
  emptyOptions,
];

// The preset takes the same options, and returns the plugins it runs.
const plugins: import('postcss').AcceptedPlugin[] = defaultPreset(everyKey);
void plugins;

// Rejected options: each line must fail to compile.
const overrideAtTopLevel: DefaultPresetOptions = {
  // @ts-expect-error overrideBrowserslist is now browserslist.query
  overrideBrowserslist: 'defaults',
};
const queryNumber: DefaultPresetOptions = {
  browserslist: {
    // @ts-expect-error the query takes a string or an array of strings
    query: 5,
  },
};
const envNumber: DefaultPresetOptions = {
  browserslist: {
    // @ts-expect-error env takes a string
    env: 1,
  },
};
const pathNumber: DefaultPresetOptions = {
  browserslist: {
    // @ts-expect-error path takes a string, the directory to search for the config
    path: 5,
  },
};
const dangerousExtendInTargets: DefaultPresetOptions = {
  browserslist: {
    // @ts-expect-error dangerousExtend is refused, so the targets type does not take it
    dangerousExtend: true,
  },
};
const disableString: DefaultPresetOptions = {
  // @ts-expect-error disable takes plugin names in an array
  disable: 'colormin',
};
const optionsNumber: DefaultPresetOptions = {
  // @ts-expect-error options maps plugin names to option objects
  options: 5,
};
const presetKey: DefaultPresetOptions = {
  // @ts-expect-error a built preset is not an option; compose presets in the PostCSS configuration
  preset: 'lite',
};
const pluginsKey: DefaultPresetOptions = {
  // @ts-expect-error plugins are configured in PostCSS, not in the preset options
  plugins: [],
};
void [
  overrideAtTopLevel,
  queryNumber,
  envNumber,
  pathNumber,
  dangerousExtendInTargets,
  disableString,
  optionsNumber,
  presetKey,
  pluginsKey,
];

// Each preset's options name only the plugins that preset runs.
const zindexOnDefault: DefaultPresetOptions = {
  // @ts-expect-error zindex is an advanced plugin, so the default preset cannot disable it
  disable: ['zindex'],
};
const misspelledOption: DefaultPresetOptions = {
  options: {
    // @ts-expect-error colormin has no option named hexes
    colormin: { hexes: true },
  },
};
void [zindexOnDefault, misspelledOption];

---
"cssnano": major
---

feat(cssnano)!: one options object for presets, plugins and browser targets

cssnano takes `preset`, `disable`, `options` and `browserslist`, inline or in a `cssnano.config.js` module. `preset` is a function imported from `cssnano/presets/default`, `cssnano/presets/lite` or `cssnano/presets/advanced`. `disable` lists transforms to leave out, and `options` configures transforms, merged over their defaults. A transform is one optimization: most plugins host one, and a single PostCSS plugin can host several. `browserslist` sets the browser targets for every plugin. A built preset is a list of PostCSS plugins, so other plugins are composed in the PostCSS configuration:

```js
import autoprefixer from 'autoprefixer';
import lite from 'cssnano/presets/lite';

export default { plugins: [autoprefixer(), ...lite({ disable: ['discardComments'] })] };
```

Without a preset, the default preset runs, and `disable` and `options` name its plugins. Types follow the chosen preset: `disable` and `options` accept only that preset's plugins.

Inline options replace the configuration file, which is then not read, `browserslist` included. An empty option sets nothing, so the file is still read.

Removed and unknown keys throw, and the message says where the setting moved: `plugins`, `svgo`, the browser target keys `overrideBrowserslist`, `env`, `stats` and `path` (see the preset-wide-browser-targets changeset), and a misspelled key. So does a transform name in `options` or `disable` that the chosen preset does not run, and a plugin name at the top level. A non-object passed to `cssnano()` throws. A known key with a value of the wrong type, a transform in both `disable` and `options`, or an unreadable configuration file throws, and the message names the key or the file.

The configuration file is a JavaScript module with a default export; a module with only named exports throws. JSON files are not read: a `.cssnanorc.json` in the working directory throws when cssnano looks for a configuration file (not with `configFile` or inline options), and a `configFile` ending in `.json` throws. Built-in presets with default options produce the same CSS as before this change.

| Before | After |
|---|---|
| `preset: 'lite'` | `preset: lite`, imported from `cssnano/presets/lite` |
| `.cssnanorc.json` with `{ "preset": "lite" }` | `cssnano.config.js` with `import lite from 'cssnano/presets/lite'; export default { preset: lite };` |
| `preset: ['default', { colormin: false }]` | `preset: defaultPreset, disable: ['colormin']` |
| `{ colormin: { exclude: true } }` | `disable: ['colormin']` |
| `{ colormin: true }`, `{ exclude: false }` | omit it |
| `['default', { discardComments: { removeAll: true } }]` | `preset: defaultPreset, options: { discardComments: { removeAll: true } }` |
| `overrideBrowserslist` (preset, plugin) | `browserslist: { query }` |
| `env`, `stats` (preset, plugin) | `browserslist: { env, stats }` |
| `path` | `browserslist: { path }` |
| `preset: lite()` | `plugins: [...lite()]` in the PostCSS configuration |
| `svgo: false` | omit it (throws) |
| `plugins: [...]` | add them to the PostCSS configuration (throws) |

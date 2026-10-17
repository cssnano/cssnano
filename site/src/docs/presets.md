---
id: presets
title: Presets
description: Choose the default, lite or advanced preset to control which optimisations cssnano runs.
---

## What are presets?

Presets are named sets of optimisations. Instead of having to opt out of
advanced transformations, you opt in by choosing a preset, and you can save
your configuration to reuse across multiple contexts. cssnano includes three
presets: `default`, `lite`, and `advanced`. All three are built in, so
importing one needs no other package.

## Import a preset

Import a preset from cssnano and pass it as the `preset` option. The presets are
`cssnano/presets/default`, `cssnano/presets/lite` and `cssnano/presets/advanced`:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: require('cssnano/presets/default'),
        }),
    ],
};
```

A configuration file imports the preset the same way, in `cssnano.config.js`:

```js
module.exports = {
    preset: require('cssnano/presets/lite'),
};
```

Without a preset, cssnano runs the `default` preset, and `disable` and
`options` name its plugins. A preset written as a name such as `'lite'` is
rejected: import the preset instead. A configuration file must be a JavaScript module, so
JSON is not read.

## Options

cssnano takes these options, and a configuration file takes the same ones:

- `preset`: an imported `default`, `lite` or `advanced` preset.
- `disable`: an array of plugin names to leave out.
- `options`: an object from plugin name to the options of that plugin, merged over
  its defaults.
- `browserslist`: the browser targets, described below.

To remove all comments, keep the default preset and set an option of the
`discardComments` plugin:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: require('cssnano/presets/default'),
            options: {
                discardComments: {
                    removeAll: true,
                },
            },
        }),
    ],
};
```

Each preset uses only the plugins of its own. A plugin that the active preset
lacks, such as `zindex` with `lite`, throws.

An unknown key, such as a misspelled `presett`, or a removed option such as
`svgo`, throws, because the default would run instead of the setting the user
wrote. The message says where a removed setting moved.

## Excluding transforms

To leave a transform out, list its plugin name in `disable`:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: require('cssnano/presets/default'),
            disable: ['colormin'],
        }),
    ],
};
```

A plugin that is in both `disable` and `options` is an error, because the two
contradict each other.

## Browser targets

cssnano gives every plugin that depends on browser support the same targets.
Set them with `browserslist`:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            browserslist: { query: 'last 2 versions, not dead' },
        }),
    ],
};
```

- `browserslist.query` is a browserslist query, or an array of them.
- `browserslist.env` names a section of the browserslist config.
- `browserslist.stats` is a usage data file path or object, for queries such as `> 1% in my stats`.

Without a `query`, cssnano reads the browserslist config that PostCSS's `from`
option points to, and otherwise uses the Baseline widely available targets. A
plugin cannot have its own targets, so a target option set in `options`, such as
`overrideBrowserslist`, throws, because ignoring it would widen the targets.

## Build a preset in PostCSS

To build a preset yourself, import it from its subpath and add its plugins to
the PostCSS configuration. A built preset is a list of PostCSS plugins, so
other plugins can sit beside it:

```js
const autoprefixer = require('autoprefixer');
const lite = require('cssnano/presets/lite');

module.exports = {
    plugins: [
        autoprefixer(),
        ...lite({ disable: ['discardComments'] }),
    ],
};
```

The subpaths are `cssnano/presets/default`, `cssnano/presets/lite` and
`cssnano/presets/advanced`. They take the same options as cssnano, except
`preset` and `configFile`.

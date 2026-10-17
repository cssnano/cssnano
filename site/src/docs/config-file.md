---
id: config-file
title: Configuration
description: Configure cssnano in your PostCSS configuration or, when you cannot reach it, in a dedicated cssnano configuration file.
---

Configure cssnano in the PostCSS configuration whenever you can. That is also
where you add other PostCSS plugins. If your framework adds cssnano and you
cannot edit the PostCSS configuration, use a dedicated cssnano configuration
file instead. Without any configuration, cssnano runs the `default` preset.

## Choose a preset

A preset is a function that you import from cssnano, not a name. Pass the
imported function as the `preset` option:

```js
import postcss from 'postcss';
import cssnano from 'cssnano';
import lite from 'cssnano/presets/lite';

postcss([
  cssnano({ preset: lite }),
]).process('/* Your CSS here */');
```

The presets are `cssnano/presets/default`, `cssnano/presets/lite` and
`cssnano/presets/advanced`. Without a preset, cssnano runs the default preset,
and `disable` and `options` name its plugins. It rejects a string such as
`'lite'`.

## Configure through the PostCSS configuration

Pass the options when you add cssnano to the PostCSS plugins. The following runs
the `lite` preset, with the comments kept, and adds autoprefixer. No cssnano
preset includes autoprefixer, so install it yourself:

```js
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';
import lite from 'cssnano/presets/lite';

postcss([
  cssnano({ preset: lite }),
  autoprefixer,
]).process('/* Your CSS here */');
```

PostCSS runs the plugins in the order you list them. A built preset is also a
list of PostCSS plugins, so you can compose one with others in the PostCSS
configuration:

```js
import lite from 'cssnano/presets/lite';

export default {
  plugins: [autoprefixer(), ...lite({ disable: ['discardComments'] })],
};
```

## Use a dedicated configuration file

Use a configuration file when the PostCSS configuration is out of reach. cssnano
reads only `cssnano.config.js` from the current working directory. It is a
JavaScript or TypeScript module, as an ES module or a CommonJS module. An ES
module must have a default export:

```js
// cssnano.config.js in an ESM project
import lite from 'cssnano/presets/lite';

export default { preset: lite };
```

cssnano does not search parent directories, and it ignores the `cssnano` key of
`package.json`. To use another file, pass its path to the `configFile` option.
The path is relative to the current working directory, or absolute. ESM
configuration files must use a default export, and top-level `await` is not
supported.

Configuration files are JavaScript because a preset is a function. JSON cannot
hold one, so cssnano does not read JSON configuration files. A `configFile` that
ends in `.json` throws, and a `.cssnanorc.json` in the working directory throws
when cssnano looks for a configuration file, because it does not read it. With
`configFile` or an inline option, cssnano does not look.

A configuration file can hold function-valued options:

```js
// cssnano.config.js
import lite from 'cssnano/presets/lite';

/** @type {import('cssnano').Config} */
export default {
  preset: lite,
  options: {
    discardComments: { remove: (comment) => comment.startsWith('!') },
  },
};
```

A configuration file has these limits:

* It is replaced by the inline options, and it does not merge with them. When you
  pass any option inline, including `browserslist`, cssnano does not read the
  file. `configFile` cannot be given with an inline option.
* A file whose `preset` is not an imported preset throws. Without a preset, the
  default preset runs.
* An unknown or removed key throws and names the file.
* Add other PostCSS plugins to the PostCSS configuration. A `plugins` key
  throws.

## Options

cssnano takes these options inline and in a configuration file. The
configuration file takes the same options, except `configFile`.

### `preset`

- **type:** a preset imported from `cssnano/presets/default`, `cssnano/presets/lite` or `cssnano/presets/advanced`
- **default:** the default preset

Chooses the set of optimisations. See [the presets guide](../presets/) for
what each preset runs.

```js
import lite from 'cssnano/presets/lite';

cssnano({ preset: lite });
```

### `disable`

- **type:** `string[]`

Plugin names to leave out, such as `['colormin']`. A name in both `disable` and
`options` is an error. A plugin name counts only when the preset runs that
plugin, so a name that the preset does not run throws. Without a preset, the
names are those of the default preset.

### `options`

- **type:** `{ [plugin]: object }`

The options of each plugin, merged over the plugin's defaults.

```js
import defaultPreset from 'cssnano/presets/default';

cssnano({ preset: defaultPreset, options: { discardComments: { removeAll: true } } });
```

### `browserslist`

- **type:** `{ query?, env?, stats?, path?, config?, ignoreUnknownVersions?, mobileToDesktop?, throwOnMissing? }`

The browser targets that every plugin uses. These are browserslist's options
under their browserslist names: `query` is the queries argument, `env` names a
section of the browserslist config, and `stats` is usage data for queries such
as `> 1% in my stats`. `path` is the directory to search for the config, and
defaults to the PostCSS `from` option. `config` names the config file to read.
An unset setting is left to browserslist. An unknown key throws. Like every
inline option, inline `browserslist` replaces the configuration file, so the
file's preset and plugin options do not apply either.

`dangerousExtend` is refused, because it lets a browserslist config extend any
package.

```js
import defaultPreset from 'cssnano/presets/default';

cssnano({ preset: defaultPreset, browserslist: { query: 'ie 11' } });
```

### `configFile`

- **type:** `string`, not empty

The path of a configuration file to use instead of the discovered one. It cannot
be combined with other inline options.

```js
cssnano({ configFile: 'config/cssnano.config.js' });
```

Any inline option, `browserslist` included, replaces the configuration file
entirely: cssnano does not read the file, and it does not merge the file with the
inline options.

## Removed options

cssnano 10 removed these. A configuration that still uses `svgo` throws, and the
message names the replacement: run [postcss-svgo](https://github.com/cssnano/cssnano/tree/main/packages/postcss-svgo)
before cssnano.

A `plugins` key throws, because the plugins it names would not run. Add PostCSS
plugins to the PostCSS configuration instead.

A configuration that still uses `overrideBrowserslist`, `env`, `stats` or `path`,
inline or in a plugin's options, throws, because ignoring it would widen the
browser targets. Use `browserslist` instead; `path` is now `browserslist.path`.

A preset name such as `'lite'` is not a removed option but a rejected value, so
cssnano throws. Import the preset from `cssnano/presets/lite` instead.

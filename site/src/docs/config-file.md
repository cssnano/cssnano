---
id: config-file
title: Configuration
---

cssnano is configured directly in your PostCSS configuration (`postcss.config.mjs` or `postcss.config.js`) or programmatically via options passed to `cssnano(options)`.

When invoked without options or with empty options, cssnano automatically applies `cssnano-preset-default`.

## Configuring with PostCSS

In your [PostCSS configuration](https://github.com/postcss/postcss#usage), configure cssnano by passing options to the plugin creator.

### Basic usage

```js
// postcss.config.mjs
import cssnano from 'cssnano';

export default {
  plugins: [
    cssnano({
      preset: 'default',
    }),
  ],
};
```

### Passing preset options

To customize preset options, pass a tuple containing the preset name (or preset function) and an options object:

```js
// postcss.config.mjs
import cssnano from 'cssnano';

export default {
  plugins: [
    cssnano({
      preset: [
        'default',
        {
          discardComments: {
            removeAll: true,
          },
        },
      ],
    }),
  ],
};
```

### Programmatic usage

When using PostCSS programmatically in JavaScript or TypeScript:

```js
import postcss from 'postcss';
import cssnano from 'cssnano';
import litePreset from 'cssnano-preset-lite';
import autoprefixer from 'autoprefixer';

const preset = litePreset({ discardComments: false });

const result = await postcss([
  cssnano({ preset, plugins: [autoprefixer] }),
]).process(css, { from: undefined });
```

## Directory-based & contextual configuration

PostCSS runners (such as `postcss-load-config`, PostCSS CLI, Vite, and Webpack) natively support contextual and directory-based configuration switching.

### Using PostCSS context

You can export a function from `postcss.config.mjs` that receives context parameters (like `ctx.file` or `ctx.env`):

```js
// postcss.config.mjs
import cssnano from 'cssnano';

export default (ctx) => ({
  plugins: [
    cssnano({
      preset: ctx.file?.includes('/legacy/')
        ? ['default', { discardComments: false }]
        : 'advanced',
    }),
  ],
});
```

### Per-directory configuration files

In monorepos or multi-package projects, place a `postcss.config.mjs` in individual subdirectories or package roots. PostCSS runners resolve the closest configuration file relative to each processed CSS file.

## Configuration options

### `preset`

- **type:** `string` | `PresetFactory` | `[string | PresetFactory, object]` | `{ plugins: PresetPlugin[] }`

Specifies the preset to use:

- **Shorthand string**: `'default'`, `'lite'`, `'advanced'`
- **Full package name**: `'cssnano-preset-default'`, `'cssnano-preset-advanced'`
- **Imported preset factory**:
  ```js
  import defaultPreset from 'cssnano-preset-default';

  cssnano({ preset: defaultPreset({ discardComments: false }) });
  ```
- **Tuple with options**:
  ```js
  cssnano({
    preset: ['default', { discardComments: { removeAll: true } }],
  });
  ```

### Disabling transforms in a preset

You can disable specific transforms within a preset by passing `false` or `{ exclude: true }` in the preset options:

```js
cssnano({
  preset: [
    'advanced',
    {
      zindex: false,
      reduceIdents: { exclude: true },
    },
  ],
});
```

### `plugins`

- **type:** `Array<string | PluginCreator | [string | PluginCreator, object]>`

Allows adding custom PostCSS plugins to the minification pipeline:

```js
import autoprefixer from 'autoprefixer';

cssnano({
  preset: 'default',
  plugins: [
    autoprefixer,
    ['postcss-preset-env', { stage: 3 }],
  ],
});
```

#### Combining `preset` and `plugins`

When both `preset` and `plugins` are provided, cssnano runs the preset's transforms first, then the extra plugins. The extra plugins are appended to the preset pipeline; they do not replace it.

#### Plugins-only mode

When `plugins` is provided without `preset`, cssnano executes only the specified plugins and does not apply the default preset:

```js
cssnano({
  plugins: [autoprefixer],
});
```

## Migrating from standalone config files

cssnano no longer discovers standalone configuration files (`.cssnanorc`, `.cssnanorc.json`, `.cssnanorc.config.json`, `cssnano.config.js`, or the `package.json#cssnano` field). Existing files of these names are **silently ignored**, so leaving one in place means cssnano falls back to the default preset with no error. Delete the file and move its contents into `postcss.config.mjs` or your build tool configuration.

The `configFile` option is also no longer recognized. Passing `cssnano({ configFile: '...' })` now emits a one-time deprecation warning and otherwise behaves as if no options were given (the default preset runs). Pass configuration directly to `cssnano(options)` instead.

### Before (`cssnano.config.js`)

```js
// cssnano.config.js (legacy)
module.exports = {
  preset: [
    'default',
    { discardComments: { removeAll: true } },
  ],
};
```

### After (`postcss.config.mjs`)

```js
// postcss.config.mjs
import cssnano from 'cssnano';

export default {
  plugins: [
    cssnano({
      preset: [
        'default',
        { discardComments: { removeAll: true } },
      ],
    }),
  ],
};
```

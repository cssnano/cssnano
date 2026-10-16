---
id: config-file
title: Configuration
description: Configure cssnano in your PostCSS configuration or in a dedicated cssnano configuration file.
---

You can configure cssnano either in the PostCSS configuration or in a dedicated cssnano configuration. The PostCSS configuration takes precedence over the dedicated cssnano configuration.
Without configuration, cssnano runs with the `default` preset.

## Configuration files
### Configure through the PostCSS configuration

In the [PostCSS configuration](https://github.com/postcss/postcss#usage), you can pass both the `preset` and `plugins` options when you add `cssnano` to the PostCSS plugins. For example, if you use PostCSS programmatically, the following uses cssnano with the `lite` preset and adds the autoprefixer plugin. No cssnano preset includes autoprefixer, so install it yourself if you need it.

```js
import postcss from 'postcss';
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';

postcss([cssnano({ preset: ['lite', { discardComments: false }], plugins: [autoprefixer] })])
  .process("/* Your CSS here */");
```

### Configure through a dedicated cssnano configuration

You can configure cssnano with a dedicated configuration, for example if you cannot access the PostCSS configuration file. The cssnano configuration can be in different formats:

* a JSON (JavaScript Object Notation) file named `.cssnanorc.json`
* a JavaScript file named `cssnano.config.js`

cssnano checks these files in the order listed, in the current working
directory only.  Only `.cssnanorc.json` and `cssnano.config.js` are
discovered automatically: use the `configFile` option
to select a configuration file in another directory. The path may be relative
to the current working directory or absolute, and you may use ESM (ECMAScript modules) and TypeScript configuration files.

ESM configuration files and TypeScript files loaded as ESM must use a default
export. A `.ts` file follows the nearest `package.json` module type. In a
CommonJS project, use `.mts` for a TypeScript configuration with a default
export, or use CommonJS exports from `.ts`:

```js
// cssnano.config.mjs, cssnano.config.mts, or cssnano.config.ts in an ESM project
export default { preset: 'lite' };
```

```js
// cssnano.config.ts in a CommonJS project
module.exports = { preset: 'lite' };
```

TypeScript files only support the TypeScript language features usable with Node.js built-in type stripping.


## Configuration options

### Choose a preset

- **option:** `preset` 
-  **type:** `string` | `function` | `[string, Objects<preset options here>]` | `[function(preset options here)]`

Pass a preset to choose a pre-configured set of optimizations. The presets
`default`, `lite`, and `advanced` are built into cssnano, so you select them by
name without installing anything else:

```js
cssnano({ preset: 'lite' })
```

Using a string is also how you choose a preset in a `.cssnanorc.json` file.
See [the presets guide](../presets/) for how cssnano resolves these names when
a `cssnano-preset-*` package is also installed in your project.

For any other preset, pass a name that points to a resolvable node module, or
pass the preset function itself:

```js
cssnano({ preset: 'my-custom-preset' })
cssnano({ preset: require('my-custom-preset') })
```

### Disable a plugin included in a preset
You can disable one or more of the plugins used in a preset.
Pass an array where the first element is the preset and the second is an object with the preset options. 
For example, here's how to deactivate the `discardComments` plugin when using the `advanced` preset:

```js
// cssnano.config.js
module.exports = {
  preset: ['advanced', { discardComments: false }]
};
```


### Use individual plugins

- **option:** `plugins`
- **type:** `Array<function | string | [function | string, Object<Options for the plugin here>]>`

You can pass PostCSS plugins to cssnano in the PostCSS configuration. cssnano
runs them after the plugins of the preset. Pass the plugin function, or an
array of the plugin function and its options:

```js
import cssnano from 'cssnano';
import autoprefixer from 'autoprefixer';

cssnano({
  preset: 'default',
  plugins: [[autoprefixer, { remove: false }]],
});
```

Always set `preset` together with `plugins`: when you pass `plugins` without a
`preset`, cssnano runs only the listed plugins and skips both the default
preset and any configuration file, so the CSS is not minified.

Pass plugin functions rather than package names. cssnano resolves a name such
as `'autoprefixer'` from its own installation directory, not from your project,
so the name may fail to load, for example with pnpm.

The `.cssnanorc.json` and `cssnano.config.js` files only support the `preset`
option. To add plugins, configure them in the PostCSS configuration instead.

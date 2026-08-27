---
id: config-file
title: Configuration
---

You can configure cssnano either in the PostCSS configuration or in a dedicated cssnano configuration. The PostCSS configuration takes precedence over the dedicated cssnano configuration.
Without configuration, cssnano runs with the `default` preset.

## Configuration files
### Configure through the PostCSS configuration

In the [PostCSS configuration](https://github.com/postcss/postcss#usage), you can pass both the `preset` and `plugins` options when you add `cssnano` to the PostCSS plugins. For example, if you use PostCSS programmatically, the following uses cssnano with the `lite` preset and adds the autoprefixer plugin.

```js
import postcss from 'postcss';
import cssnano from 'cssnano';
import litePreset from 'cssnano-preset-lite';
import autoprefixer from 'autoprefixer';
const preset = litePreset({ discardComments: false });

postcss([cssnano({ preset, plugins: [autoprefixer] })])
  .process("/* Your CSS here */");
```

### Configure through a dedicated cssnano configuration

You can configure cssnano with a dedicated configuration, for example if you cannot access the PostCSS configuration file. The cssnano configuration can be in different formats:

* a JSON file named `.cssnanorc.json`
* a JavaScript file named `cssnano.config.js`
* an ESM file with an `.mjs` extension
* a TypeScript file with a `.ts` or `.mts` extension

cssnano checks these files in the order listed, in the current working
directory only. It does not search parent directories, and `.cssnanorc` and the
`cssnano` field in `package.json` are not supported. Use the `configFile` option
to select a configuration file in another directory. The path may be relative
to the current working directory or absolute, and its filename is unrestricted.
This means `.cssnanorc.js` is supported when selected explicitly, but is not
discovered automatically. Only `.cssnanorc.json` and `cssnano.config.js` are
discovered automatically; the other formats, including `.mjs`, `.ts`, and
`.mts`, must be selected with `configFile`.

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

TypeScript files are loaded using Node's built-in type stripping. They must use
syntax that Node can erase natively; enums, decorators, parameter properties,
path aliases, and transformations that depend on `tsconfig.json` are not
supported.


## Configuration options

### Choose a preset

- **option:** `preset` 
-  **type:** `string` | `function` | `[string, Objects<preset options here>]` | `[function(preset options here)]`

Pass a preset to choose a pre-configured set of optimizations. You can specify a preset with the preset name as a string or by passing the result of importing the preset package.

With the preset as import:

```js
cssnano({ preset: require('cssnano-preset-default') })
```

Using a string is useful if you use a configuration file in the JSON format.


```js
cssnano({ preset: 'cssnano-preset-default' })
```

The strings `default`, `lite`, and `advanced` are shorthand for the built-in
`cssnano-preset-*` packages:

```js
cssnano({ preset: 'lite' })
```

For any other preset, pass its complete resolvable package name. cssnano does
not add a `cssnano-preset-` prefix to arbitrary strings:

```js
cssnano({ preset: 'my-custom-preset' })
```

### Disable a plugin included in a preset
You can disable one or more of the plugins used in a preset.
Pass an array where the first element is the preset and the second is an object with the preset options. 


```js
// cssnano.config.js
module.exports = {
  preset: [ 
    require('cssnano-preset-default'),
    { discardComments: false } 
  ]
};
```


You can also pass preset options when you use the preset name as a string:
For example, here's how to deactivate the `discardComments` plugin when using the `advanced` preset:

```js
cssnano({ 
  preset: [
    'cssnano-preset-advanced', { discardComments: false }
  ]
});
```


### Use individual plugins

- **option:** `plugins`
- **type:** `Array<'string' | 'function' | ['string' | 'function', Object<Options for the plugin here>]>`

You can also pass a list of plugins to cssnano.
To configure the individual plugins, use an array of arrays:

```js
cssnano({ plugins: [['autoprefixer', {}]] });
```

- **Example:**
   
  ```js
  // cssnano.config.js
  module.exports = {
    plugins: [require('autoprefixer')]
    
    // or
    plugins: ['autoprefixer', 'postcss-preset-env']
    
    // or
    plugins: [ 
      ['autoprefixer', { remove: false }],
    ]

    // or
    plugins: [
      [ require('autoprefixer'), {remove: false} ],
      [ 'postcss-preset-env']
    ]
  };
  ```

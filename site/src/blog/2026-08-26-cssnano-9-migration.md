---
title: Migrating to cssnano 9
author: cssnano maintainers
readableDate: "August 26, 2026"
slug: cssnano-9-migration-guide
---

cssnano 9 introduces a new postcss-calc plugin, moves to ESM-only and narrows configuration discovery.

## New calc simplifier
The new postcss-calc plugin is ESM-only. That means to use it inside cssnano, we had either to have users rewrite their CommonJS configuration files or require a Node.js version that supports requiring ESM modules, hence the major version change.
The new postcss-calc plugin is entirely rewritten and should support most of the cases that lead to console warnings. It also fixes a few bugs.


## Place configuration in a supported location

The following changes likely do not affect you if you configure cssnano in the postcss configuration file. For a long time, it has been possible to configure cssnano in a separate configuration file. Because few users seemed to take advantage of that and the code was full of branches and untested, the way the configuration worked or was supposed to work was never entirely clear.

cssnano 9 checks configuration in the current working directory only, in this order:

1. `.cssnanorc.json`
2. `cssnano.config.js`

It no longer searches parent directories, `package.json`, `.cssnanorc.js`, or the
extensionless `.cssnanorc` file. Rename or move the configuration file if you
were relying on automatic discovery of those names. The `configFile` option can
still explicitly select any configuration filename, including `.mjs`, `.ts`,
and `.mts` files. These ESM and TypeScript files must use a default export.
TypeScript uses Node's built-in type stripping, so only erasable TypeScript
syntax is supported; for example, enums, decorators, parameter properties,
path aliases, and `tsconfig.json`-dependent transforms are not supported.

```js
import cssnano from 'cssnano';

cssnano({ configFile: './config/cssnano.config.js' });
```


cssnano can synchronously load CommonJS plugins, presets, and configuration
files, as well as ESM configuration files selected explicitly. It cannot load
an ESM preset defined as an ESM module and passed to the cssnano configuration
as a string only. Import ESM modules in your application and pass the imported value:

```js
import cssnano from 'cssnano';
import customPreset from './custom-preset.js';

cssnano({ preset: customPreset });
```

This lets the application load the ESM module with `import` before cssnano
constructs its PostCSS processor. cssnano must construct that processor
synchronously when `cssnano()` is called. Although PostCSS supports asynchronous
work while processing CSS, it does not await an asynchronous plugin factory while
building the plugin list. Using `import()` inside cssnano would return
a promise instead of a PostCSS plugin and would break the PostCSS plugin API.

## Check imports

Deep imports such as `cssnano/src`, `cssnano/src/index.js`, and
`cssnano-preset-default/src` are no longer available. Import from package roots
instead:

```js
import postcss from 'postcss';
import cssnano from 'cssnano';

const result = await postcss([
  cssnano({ preset: 'default' }),
]).process(input, { from: undefined });
```

The same applies to presets and individual plugins:

```js
import defaultPreset from 'cssnano-preset-default';
import postcssDiscardComments from 'postcss-discard-comments';
```

## Check Node.js compatibility

cssnano 9 requires one of these Node.js versions in both local development and
CI:

* `^22.22.3`
* `^24.15.0`
* `>=26.0`

The Node.js versions released after require(ESM) modules was made stable.

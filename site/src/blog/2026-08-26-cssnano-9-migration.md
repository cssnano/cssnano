---
title: Migrating to cssnano 9
author: cssnano team
excerpt: cssnano 9.0 should be mostly backward compatible if you are running the supported Node.js versions already. You will need to make adjustments to your configuration only if you use some of the standalone cssnano configuration files instead of configuring cssnano through your PostCSS configuration.
publishedAt: 2026-08-27
slug: cssnano-9-migration-guide
---

cssnano 9.0 should be mostly backward compatible if you are running the supported Node.js versions already. You will need to make adjustments to your configuration only if you use some of the standalone cssnano configuration files instead of configuring cssnano through your PostCSS configuration.

## New `calc()` minifier

The new postcss-calc plugin is entirely rewritten and should support most of the cases that triggered console warnings in the past.

## Configuration file adjustments

From bug reports, it seems that few users configure cssnano outside of their PostCSS configuration. Nevertheless, for a long time, it has been possible to configure cssnano presets and plugins in a separate configuration file. The configuration code was untested and a bit convoluted, and the expected behaviour never clearly documented, so it was unclear even to the maintainers how it was meant to work.

To continue supporting users who might not be able to access the PostCSS configuration, we have retained the support for custom cssnano configuration files, but with simplified behaviour:
cssnano 9.0 searches automatically for configuration only in the current working directory, in the following files in order:

1. `.cssnanorc.json`
2. `cssnano.config.js`

cssnano no longer searches parent directories, `package.json`, `.cssnanorc.js`, or the
extensionless `.cssnanorc` file. You can either move the configuration file or you can still pass other configuration names to the `configFile` option, including `.mjs`, `.ts`,
and `.mts` files.


```js
import cssnano from 'cssnano';

cssnano({ configFile: './config/cssnano.config.js' });
```
cssnano uses Node's built-in type stripping for TypeScript files.

To define presets in an ESM module, import the module directly in your configuration:

```js
import cssnano from 'cssnano';
import customPreset from './custom-preset.js';

cssnano({ preset: customPreset });
```

When writing your configuration file, ensure that cssnano can construct its configuration synchronously when `cssnano()` is called.

## Preset naming
When loading a preset fails, cssnano 9.0 does not prepend the `cssnano-preset-` prefix to a preset name and try loading the new name. The preset name you pass is the only preset name cssnano 9.0 is going to attempt to load.

## Imports adjustements

cssnano is now distributed as an ESM-only package.
Deep imports such as `cssnano/src`, `cssnano/src/index.js`, and
`cssnano-preset-default/src` are no longer available. It is unlikely these sort of imports were ever useful, so this step was taken more to prevent accidentally relying on cssnano internals.

## Supported Node.js releases

To ensure that using `require()` with ESM modules and type stripping for the configuration work as expected, cssnano 9.0 requires one of these Node.js versions

* `22.22.3` or later in the 22.x releases
* `24.15.0` or later in the 24.x release stream
* `>=26.0`

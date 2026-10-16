---
id: presets
title: Presets
description: Choose the default, lite or advanced preset to control which optimisations cssnano runs.
---

## What are presets?

Presets are named sets of optimisations. Instead of having to opt out of
advanced transformations, you opt in by choosing a preset, and you can save
your configuration to reuse across multiple contexts. cssnano includes three
presets: `default`, `lite`, and `advanced`.


## How do presets work?

cssnano runs a few different operations to check what preset it should use.
Firstly, it checks that it was loaded with a preset when it was initialized;
if so, it will use that one. For example, using a `postcss.config.js` in the
project root:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: 'default',
        }),
    ],
};
```

_The preset names `default`, `lite`, and `advanced` select the presets built
into cssnano, so they need no separate install. `default` always uses the
built-in preset. For `lite`, `advanced` and the full `cssnano-preset-*` names,
an installed package with the same name takes precedence, and cssnano prints a
`CSSNANO_INSTALLED_PRESET` warning so an outdated install does not go
unnoticed. Uninstall the package to use the built-in preset, or pass the
imported preset function to keep the installed one without the warning. For
other presets, pass the complete resolvable package name._

If you need to pass any options to a preset, you must specify them using the
array syntax instead. For example, you can remove all comments with the
following configuration:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: ['default', {
                discardComments: {
                    removeAll: true,
                },
            }]
        }),
    ],
};
```

For other cases where the preset was not explicitly set, cssnano checks the
supported configuration files in the current working directory. It does not
search parent directories. These two configuration examples function
identically to the above. A `.cssnanorc.json`:

```json
{
  "preset": [
    "default",
    {"discardComments": {"removeAll": true}}
  ]
}
```

And a `cssnano.config.js`:

```js
module.exports = {
    preset: ['default', {
        discardComments: {
            removeAll: true,
        },
    }],
};
```

_The `cssnano.config.js` is useful if you need to make use of transformations
that can accept functions as parameters, for more specific use cases._

If cssnano was not loaded with a preset explicitly, and a local configuration
file was not found, then the defaults will be loaded. Use `configFile` when the
configuration is stored in another directory. cssnano automatically discovers
`.cssnanorc.json` and `cssnano.config.js`. The `configFile` can point to any filename with a supported extension.
An example `postcss.config.js`:

```js
module.exports = {
    plugins: [
        require('cssnano'),
    ],
};
```

For most use cases, the default preset should be suitable, but
we also offer an advanced preset which performs more aggressive transformations.
You can read more about this in
[our advanced transformations guide][guideadvancedtransforms].


## Options syntax

The options follow a simple pattern - the optional `postcss-` prefix is removed
and then the rest should be converted into `camelCase`. So, if you need to set
an option for `postcss-colormin`, you can do:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: ['default', {
                colormin: {
                    // plugin options
                },
            }],
        }),
    ],
};
```


## Excluding transforms

You may wish to exclude a transform from the list if it isn't required for your
build; there are two possible ways to do this. The first is to set the option
key to `false`:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: ['default', {
                colormin: false,
            }],
        }),
    ],
};
```

Alternately, if you have already supplied options and would prefer to exclude
a transform temporarily, you may set the `exclude` option:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: ['default', {
                colormin: {
                    exclude: true,
                },
            }],
        }),
    ],
};
```

[guideadvancedtransforms]: ../advanced-transforms/

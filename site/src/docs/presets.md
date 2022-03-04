---
id: presets
title: Presets
layout: layouts/MainLayout.njk
---

## What are presets?

Starting with version 4, presets are a way of loading cssnano with different
features, depending on your use case. Now, instead of having to opt-out of
advanced transformations, you can choose to opt-in instead. Prior to the
introduction of presets, code to perform advanced transformations was downloaded
from npm whether or not it was used. Presets ensure that this is no longer the
case, and also afford the ability to save configuration for cssnano to re-use
across multiple contexts.


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

_The preset name points to a resolvable node module, optionally with the
`cssnano-preset-` prefix. So you can specify `cssnano-preset-default` here
instead if you wish._

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

For other cases where the preset was not explicitly set, cssnano will look
for a section in your `package.json` or a `cssnano.config.js`, from the current
working directory upwards until it reaches your home directory. These two
configuration examples function identically to the above:

```json
{
  "name": "awesome-application",
  "cssnano": {
    "preset": [
      "default",
      {"discardComments": {"removeAll": true}}
    ]
  }
}
```

And the `cssnano.config.js`:

```js
const defaultPreset = require('cssnano-preset-default');

module.exports = defaultPreset({
    discardComments: {
        removeAll: true,
    },
});
```

_The `cssnano.config.js` is useful if you need to make use of transformations
that can accept functions as parameters, for more specific use cases._

If cssnano was not loaded with a preset explicitly, or a config section/file
were not found in any parent directories, then the defaults will be loaded.
An example `postcss.config.js`:

```js
module.exports = {
    plugins: [
        require('cssnano'),
    ],
};
```

For most use cases, the default preset should be suitable for your needs, but
we also offer an advanced preset which performs more aggressive transformations.
You can read more about this in
[our advanced transformations guide][guideadvancedtransforms].


## Options syntax

The options follow a simple pattern - the optional `postcss-` prefix is removed
and then the rest should be converted into `camelCase`. So, if you need to set
an option for `postcss-svgo`, you can do:

```js
module.exports = {
    plugins: [
        require('cssnano')({
            preset: ['default', {
                svgo: {
                    plugins: [{
                        removeDoctype: false,
                    }],
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
                svgo: false,
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
                svgo: {
                    exclude: true,
                },
            }],
        }),
    ],
};
```

[guideadvancedtransforms]: /docs/advanced-transforms

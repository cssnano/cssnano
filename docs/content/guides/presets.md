---
title: Presets
layout: Guide
order: 3
---


## What are presets?

Presets are a way of loading cssnano with different features, depending on
your use case, and they were introduced in version 4. Now, instead of having
to opt-out of advanced transformations, you can choose to opt-in instead. Prior
to the introduction of presets, code to perform advanced transformations was
downloaded from npm whether or not it was used. Presets ensure that this is no
longer the case, and also afford the ability to save configuration for cssnano
to re-use across multiple contexts.


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
for a `cssnano.config.js` or a section in your `package.json`, from the current
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

[guideadvancedtransforms]: /guides/advanced-transforms

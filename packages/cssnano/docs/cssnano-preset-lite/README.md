# cssnano-preset-lite

> Safe and minimum transformation with just removing whitespaces, line breaks and comments

## Table of Contents

- [Overview](#overview)

- [Usage](#usage)

  - [Install](#install)
  - [Configuration](#configuration)

- [Plugins](#plugins)

- [Contributors](#contributors)

- [License](#license)

## Overview

This lite preset for cssnano only includes transforms that only removes extra whitespace,
linebreaks, and comments.

## Usage

### Install

This preset comes bundled with cssnano, so you don't need to install it separately.

### Configuration

If you would like to use the default configuration, then you don't need any additional configuration.

But should you wish to customise this, you can set the `options` key of the configuration. For example, to remove all comments, add a `cssnano.config.js` to the directory where you run the build, and import the preset in it:

```js
// cssnano.config.js
import lite from 'cssnano/presets/lite';

export default {
  preset: lite,
  options: { discardComments: { removeAll: true } },
};
```

Options that hold functions work the same way, because the configuration file is a JavaScript module:

```js
// cssnano.config.js
import lite from 'cssnano/presets/lite';

export default {
  preset: lite,
  options: {
    discardComments: {
      remove: (comment) => comment[0] === '@',
    },
  },
};
```

To compose the preset with other PostCSS plugins, load it in the PostCSS configuration instead, since a built preset is a list of plugins:

```js
// postcss.config.js
import litePreset from 'cssnano/presets/lite';

export default {
  plugins: [
    ...litePreset({
      options: {
        discardComments: {
          remove: (comment) => comment[0] === '@',
        },
      },
    }),
  ],
};
```

Note that you may wish to publish your own preset to npm for reusability, should it differ a lot from this one. This is highly encouraged!

## Plugins

The plugins in this preset, and the option that enables each, are listed on the [optimisations page](https://cssnano.github.io/cssnano/docs/what-are-optimisations/).

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

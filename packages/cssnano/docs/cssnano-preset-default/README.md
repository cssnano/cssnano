# cssnano-preset-default

> Safe defaults for cssnano which require minimal configuration.

## Table of Contents

- [Overview](#overview)

- [Usage](#usage)

  - [Install](#install)
  - [Configuration](#configuration)

- [Plugins](#plugins)

- [Contributors](#contributors)

- [License](#license)

## Overview

This default preset for cssnano only includes transforms that make no
assumptions about your CSS other than what is passed in. In previous
iterations of cssnano, assumptions were made about your CSS which caused
output to look different in certain use cases, but not others. These
transforms have been moved from the defaults to other presets, to make
this preset require only minimal configuration.

## Usage

### Install

Note that this preset comes bundled with cssnano _by default_, so you don't need to install it separately.

### Configuration

If you would like to use the default configuration, then you don't need to add anything to a cssnano configuration file.

But should you wish to customise this, you can set the `options` key of the configuration. For example, to remove all comments:

```js
// cssnano.config.js
module.exports = {
  preset: require('cssnano/presets/default'),
  options: {
    discardComments: { removeAll: true },
  },
};
```

For options with customisable function parameters, use a `cssnano.config.js` in the directory where you run the build, since cssnano looks up its configuration from the current working directory. A JavaScript configuration file can hold the functions directly:

```js
// cssnano.config.js
export default {
  preset: require('cssnano/presets/default'),
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
import defaultPreset from 'cssnano/presets/default';

export default {
  plugins: [
    ...defaultPreset({
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

## License

MIT © [Ben Briggs](https://beneb.info)

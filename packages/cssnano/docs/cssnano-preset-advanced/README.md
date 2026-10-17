# cssnano-preset-advanced

> Advanced optimisations for cssnano; may or may not break your CSS!

## Table of Contents

- [Usage](#usage)

  - [Install](#install)
  - [Configuration](#configuration)

- [Plugins](#plugins)

- [Contributors](#contributors)

- [License](#license)

## Usage

### Install

This preset comes bundled with cssnano, so you don't need to install it separately.

### Configuration

If you would like to use the preset in its default configuration, add it to your `cssnano.config.js`:

```js
// cssnano.config.js
module.exports = {
  preset: require('cssnano/presets/advanced'),
};
```

But should you wish to customise this, you can set the `options` key of the configuration. For example, to remove all comments:

```js
// cssnano.config.js
module.exports = {
  preset: require('cssnano/presets/advanced'),
  options: {
    discardComments: { removeAll: true },
  },
};
```

For options with customisable function parameters, use a `cssnano.config.js` in the directory where you run the build, since cssnano looks up its configuration from the current working directory. A JavaScript configuration file can hold the functions directly:

```js
// cssnano.config.js
export default {
  preset: require('cssnano/presets/advanced'),
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
import advancedPreset from 'cssnano/presets/advanced';

export default {
  plugins: [
    ...advancedPreset({
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

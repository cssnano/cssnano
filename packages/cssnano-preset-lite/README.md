# cssnano-preset-lite

> Safe and minimum transformation with just removing whitespaces, line breaks and comments

## Table of Contents

- [Overview](#overview)

- [Usage](#usage)

  - [Install](#install)
  - [Configuration](#configuration)

- [Plugins](#plugins)

  - [cssnano-utils](#cssnano-utils)
  - [postcss-discard-comments](#postcss-discard-comments)

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

If you would like to use the default configuration, then you don't need to add anything to your `package.json`.

But should you wish to customise this, you can pass an array with the second parameter as the options object to use. For example, to remove all comments:

```diff
 {
   "name": "awesome-application",
+  "cssnano": {
+    "preset": [
+      "lite",
+      {"discardComments": {"removeAll": true}}
+    ]
+  }
 }
```

Depending on your usage, the JSON configuration might not work for you, such as in cases where you would like to use options with customisable function parameters. For this use case, we recommend a `cssnano.config.js` at the same location as your `package.json`. You can then load a preset and export it with your custom parameters:

```js
const defaultPreset = require('cssnano-preset-lite');

module.exports = defaultPreset({
  discardComments: {
    remove: (comment) => comment[0] === '@',
  },
});
```

Note that you may wish to publish your own preset to npm for reusability, should it differ a lot from this one. This is highly encouraged!

## Plugins

### [`cssnano-utils`](https://github.com/cssnano/cssnano/tree/master/packages/cssnano-utils)

> Utility methods used by cssnano


### [`postcss-discard-comments`](https://github.com/cssnano/cssnano/tree/master/packages/postcss-discard-comments)

> Discard comments in your CSS files with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-normalize-whitespace`](https://github.com/cssnano/cssnano/tree/master/packages/postcss-normalize-whitespace)

> Trim whitespace inside and around CSS rules & declarations.

This plugin is loaded with its default configuration.


## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).

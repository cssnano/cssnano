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
  - [postcss-discard-empty](#postcss-discard-empty)
  - [postcss-normalize-whitespace](#postcss-normalize-whitespace)

- [Contributors](#contributors)

- [License](#license)

## Overview

This lite preset for cssnano only includes transforms that only removes extra whitespace,
linebreaks, and comments.

## Usage

### Install

With [npm](https://npmjs.com/package/cssnano-preset-lite) do:

    npm install cssnano-preset-lite --save-dev

If you don't have npm then [check out this installation tutorial](https://npmjs.com/package/cssnano-preset-lite/tutorial).

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

### [`postcss-discard-empty`](https://github.com/cssnano/cssnano/tree/master/packages/postcss-discard-empty)

> Discard empty rules and values with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-normalize-whitespace`](https://github.com/cssnano/cssnano/tree/master/packages/postcss-normalize-whitespace)

> Trim whitespace inside and around CSS rules & declarations.

This plugin is loaded with its default configuration.


## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).

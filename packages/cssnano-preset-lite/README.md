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
 
Configure options for `cssnano-preset-lite` in your PostCSS configuration (such as `postcss.config.mjs`):

```js
// postcss.config.mjs
import cssnano from 'cssnano';

export default {
  plugins: [
    cssnano({
      preset: [
        'lite',
        {
          discardComments: {
            removeAll: true,
          },
        },
      ],
    }),
  ],
};
```

You can also pass preset factory functions directly if you need to supply function parameters:

```js
// postcss.config.mjs
import cssnano from 'cssnano';
import litePreset from 'cssnano-preset-lite';

export default {
  plugins: [
    cssnano({
      preset: litePreset({
        discardComments: {
          remove: (comment) => comment[0] === '@',
        },
      }),
    }),
  ],
};
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

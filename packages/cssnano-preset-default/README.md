# cssnano-preset-default

> Safe defaults for cssnano which require minimal configuration.


## Table of Contents

-   [Plugins](#plugins)

    -   [cssnano-style-cache](#cssnano-style-cache)
    -   [postcss-calc](#postcss-calc)
    -   [postcss-colormin](#postcss-colormin)
    -   [postcss-convert-values](#postcss-convert-values)
    -   [postcss-discard-comments](#postcss-discard-comments)
    -   [postcss-discard-duplicates](#postcss-discard-duplicates)
    -   [postcss-discard-empty](#postcss-discard-empty)
    -   [postcss-discard-overridden](#postcss-discard-overridden)
    -   [postcss-merge-longhand](#postcss-merge-longhand)
    -   [postcss-merge-rules](#postcss-merge-rules)
    -   [postcss-minify-font-values](#postcss-minify-font-values)
    -   [postcss-minify-gradients](#postcss-minify-gradients)
    -   [postcss-minify-params](#postcss-minify-params)
    -   [postcss-minify-selectors](#postcss-minify-selectors)
    -   [postcss-normalize-charset](#postcss-normalize-charset)
    -   [postcss-normalize-display-values](#postcss-normalize-display-values)
    -   [postcss-normalize-positions](#postcss-normalize-positions)
    -   [postcss-normalize-repeat-style](#postcss-normalize-repeat-style)
    -   [postcss-normalize-string](#postcss-normalize-string)
    -   [postcss-normalize-timing-functions](#postcss-normalize-timing-functions)
    -   [postcss-normalize-unicode](#postcss-normalize-unicode)
    -   [postcss-normalize-url](#postcss-normalize-url)
    -   [postcss-normalize-whitespace](#postcss-normalize-whitespace)
    -   [postcss-ordered-values](#postcss-ordered-values)
    -   [postcss-reduce-initial](#postcss-reduce-initial)
    -   [postcss-reduce-transforms](#postcss-reduce-transforms)
    -   [postcss-svgo](#postcss-svgo)
    -   [postcss-unique-selectors](#postcss-unique-selectors)

-   [Install](#install)

-   [Contributors](#contributors)

-   [License](#license)


## Plugins

### `cssnano-style-cache`

This plugin is loaded with its default configuration.

### `postcss-calc`

This plugin is loaded with its default configuration.

### [`postcss-colormin`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-colormin)

> Minify colors in your CSS files with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-convert-values`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-convert-values)

> Convert values with PostCSS (e.g. ms -> s)

This plugin is loaded with the following configuration:

```js
{
	length: false
}
```

### [`postcss-discard-comments`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-discard-comments)

> Discard comments in your CSS files with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-discard-duplicates`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-discard-duplicates)

> Discard duplicate rules in your CSS files with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-discard-empty`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-discard-empty)

> Discard empty rules and values with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-discard-overridden`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-discard-overridden)

> PostCSS plugin to discard overridden @keyframes or @counter-style.

This plugin is loaded with its default configuration.

### [`postcss-merge-longhand`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-merge-longhand)

> Merge longhand properties into shorthand with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-merge-rules`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-merge-rules)

> Merge CSS rules with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-minify-font-values`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-minify-font-values)

> Minify font declarations with PostCSS

This plugin is loaded with its default configuration.

### [`postcss-minify-gradients`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-minify-gradients)

> Minify gradient parameters with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-minify-params`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-minify-params)

> Minify at-rule params with PostCSS

This plugin is loaded with its default configuration.

### [`postcss-minify-selectors`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-minify-selectors)

> Minify selectors with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-normalize-charset`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-charset)

> Add necessary or remove extra charset with PostCSS

This plugin is loaded with the following configuration:

```js
{
	add: false
}
```

### [`postcss-normalize-display-values`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-display-values)

> Normalize multiple value display syntaxes into single values.

This plugin is loaded with its default configuration.

### [`postcss-normalize-positions`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-positions)

> Normalize keyword values for position into length values.

This plugin is loaded with its default configuration.

### [`postcss-normalize-repeat-style`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-repeat-style)

> Convert two value syntax for repeat-style into one value.

This plugin is loaded with its default configuration.

### [`postcss-normalize-string`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-string)

> Normalize wrapping quotes for CSS string literals.

This plugin is loaded with its default configuration.

### [`postcss-normalize-timing-functions`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-timing-functions)

> Normalize CSS animation/transition timing functions.

This plugin is loaded with its default configuration.

### [`postcss-normalize-unicode`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-unicode)

> Normalize unicode-range descriptors, and can convert to wildcard ranges.

This plugin is loaded with its default configuration.

### [`postcss-normalize-url`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-url)

> Normalize URLs with PostCSS

This plugin is loaded with its default configuration.

### [`postcss-normalize-whitespace`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-normalize-whitespace)

> Trim whitespace inside and around CSS rules & declarations.

This plugin is loaded with its default configuration.

### [`postcss-ordered-values`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-ordered-values)

> Ensure values are ordered consistently in your CSS.

This plugin is loaded with its default configuration.

### [`postcss-reduce-initial`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-reduce-initial)

> Reduce initial definitions to the actual initial value, where possible.

This plugin is loaded with its default configuration.

### [`postcss-reduce-transforms`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-reduce-transforms)

> Reduce transform functions with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-svgo`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-svgo)

> Optimise inline SVG with PostCSS.

This plugin is loaded with its default configuration.

### [`postcss-unique-selectors`](https://github.com/ben-eb/cssnano/tree/master/packages/postcss-unique-selectors)

> Ensure CSS selectors are unique.

This plugin is loaded with its default configuration.


## Install

With [npm](https://npmjs.com/package/cssnano-preset-default) do:

    npm install cssnano-preset-default --save-dev

If you don't have npm then [check out this installation tutorial](https://npmjs.com/package/cssnano-preset-default/tutorial).


## Contributors

See [CONTRIBUTORS.md](https://github.com/ben-eb/cssnano/blob/master/CONTRIBUTORS.md).


## License

MIT © [Ben Briggs](http://beneb.info)


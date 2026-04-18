# [postcss][postcss]-minify-selectors

> Minify selectors with PostCSS.

## Install

With [npm](https://www.npmjs.com/package/postcss-minify-selectors) do:

```
npm install postcss-minify-selectors --save
```

## Example

### Input

```css
h1 + p, h2, h3, h2{color:blue}
```

### Output

```css
h1+p,h2,h3{color:blue}
```

For more examples see the [tests](test/index.js).

## Options

### `sort`

Type: `boolean`  
Default: `true`

Alphabetically sort selectors within a comma-separated list.

### `convertToIs`

Type: `boolean`  
Default: `true`

Factor a shared prefix and/or suffix in a comma-separated selector list into
a single `:is(...)` group when the result is strictly shorter and safe with
respect to the cascade. The rewrite only applies when every variable part
has the same CSS specificity (so the cascade isn't silently altered) and
contains no pseudo-elements. It is automatically skipped when the configured
`browserslist` target doesn't support `:is()`.

#### Input

```css
section h1, article h1, aside h1, nav h1 { font-size: 25px }
```

#### Output

```css
:is(article,aside,nav,section) h1{font-size:25px}
```

### Browserslist

The plugin reads the `browserslist` configuration from the host project by
default. You can override with `overrideBrowserslist`, `stats`, `env`, or
`path` — the same options accepted by `autoprefixer` and `postcss-merge-rules`.

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](http://beneb.info)

[postcss]: https://github.com/postcss/postcss

# [postcss][postcss]-normalize-string

> Normalize strings with PostCSS.

## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

### Input

```css
p:after{ content: '\\'string\\' is intact' }
```

### Output

```css
p:after{ content: "'string' is intact" }
```

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## API

### normalize([options])

#### options

##### preferredQuote

Type: `string`
Default: `double`

Sets what type of quote to prefer. Possible values are `single` and `double`.

```js
var css = 'p:after{content:""}';
console.log(postcss(normalize({preferredQuote: 'single'})).process(css).css);
//=> p:after{content:''}
```

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)

[postcss]: https://github.com/postcss/postcss

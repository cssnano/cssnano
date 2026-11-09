# [postcss][postcss]-reduce-initial

> Reduce `initial` definitions to the _actual_ initial value, where possible.

## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Examples

See the [data](../../src/plugins/postcss-reduce-initial/data/) for more conversions. This data is courtesy
of Mozilla.

### Convert `initial` values

When the `initial` keyword is longer than the property value, it will
be converted:

#### Input

```css
h1 {
  min-width: initial;
}
```

#### Output

```css
h1 {
  min-width: auto;
}
```

### Convert values back to `initial`

When the `initial` value is smaller than the property value, it will
be converted:

#### Input

```css
h1 {
  background-clip: border-box;
}
```

#### Output

```css
h1 {
  background-clip: initial;
}
```

This conversion is only applied when you supply a browsers list that all support
the `initial` keyword; it's worth noting that Internet Explorer has no support.

## API

### reduceInitial([options])

#### options

##### ignore

Type: `Array<String>`
Default: `undefined`

It contains the Array of properties that will be ignored while reducing its value to initial.
Example : `{ ignore : ["min-height"] }`

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

This program uses a list of CSS properties derived from data maintained my the MDN team at Mozilla and licensed under the [CC0 1.0 Universal Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/).

MIT © [Ben Briggs](https://beneb.info)

[postcss]: https://github.com/postcss/postcss

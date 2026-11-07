# [postcss][postcss]-unique-selectors

> Ensure CSS selectors are unique.

## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

Selectors are sorted naturally, and deduplicated:

### Input

```css
h1,h3,h2,h1 {
    color: red
}
```

### Output

```css
h1,h2,h3 {
    color: red
}
```

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)

[postcss]: https://github.com/postcss/postcss

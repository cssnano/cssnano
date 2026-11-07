# [postcss][postcss]-reduce-transforms

> Reduce transform functions with PostCSS.

## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

This module will reduce transform functions where possible. For more examples,
see the [tests](test).

### Input

```css
h1 {
  transform: rotate3d(1, 0, 0, 20deg);
}
```

### Output

```css
h1 {
  transform: rotateX(20deg);
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

# [postcss][postcss]-normalize-whitespace

> Normalize whitespace with PostCSS.

## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

### Input

```css
h1 {
    width: calc(10px - ( 100px / var(--test) ));
}
```

### Output

```css
h1{width:calc(10px - (100px / var(--test)))}
```

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)

[postcss]: https://github.com/postcss/postcss

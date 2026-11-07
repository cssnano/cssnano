# [postcss][postcss]-discard-empty

> Discard empty rules and values with PostCSS.

## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

For more examples see the [tests](test).

### Input

```css
@font-face;
h1 {}
{color:blue}
h2 {color:}
h3 {color:red}
```

### Output

```css
h3 {color:red}
```

## Usage

See the [PostCSS documentation](https://github.com/postcss/postcss#usage) for
examples for your environment.


## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).


## License

MIT © [Ben Briggs](https://beneb.info)


[postcss]: https://github.com/postcss/postcss

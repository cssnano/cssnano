# [postcss][postcss]-merge-idents

> Merge keyframe and counter style identifiers.


## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

This module will merge identifiers such as `@keyframes` and `@counter-style`,
if their properties are identical. Then, it will update those declarations that
depend on the duplicated property.

### Input

```css
@keyframes rotate {
    from { transform: rotate(0) }
    to { transform: rotate(360deg) }
}

@keyframes flip {
    from { transform: rotate(0) }
    to { transform: rotate(360deg) }
}

.rotate {
    animation-name: rotate
}

.flip {
    animation-name: flip
}
```

### Output

```css
@keyframes flip {
    from { transform: rotate(0) }
    to { transform: rotate(360deg) }
}

.rotate {
    animation-name: flip
}

.flip {
    animation-name: flip
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

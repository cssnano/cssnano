# [postcss][postcss]-reduce-idents

> Reduce [custom identifiers][idents] with PostCSS.


## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

### Input

This module will rename custom identifiers in your CSS files; it does so by
converting each name to a index, which is then encoded into a legal identifier.
A legal custom identifier in CSS is case sensitive and must start with a
letter, but can contain digits, hyphens and underscores. There are over 3,000
possible two character identifiers, and 51 possible single character identifiers
that will be generated.

```css
@keyframes whiteToBlack {
    0% {
        color: #fff
    }
    to {
        color: #000
    }
}

.one {
    animation-name: whiteToBlack
}
```

### Output

```css
@keyframes a {
    0% {
        color: #fff
    }
    to {
        color: #000
    }
}

.one {
    animation-name: a
}
```

Note that this module does not handle identifiers that are not linked together.
The following example will not be transformed in any way:

```css
@keyframes fadeOut {
    0% { opacity: 1 }
    to { opacity: 0 }
}

.fadeIn {
    animation-name: fadeIn;
}
```

A name that reads as a keyword of the property it is written in is also left
alone, because renaming it would change what the declaration means. In
`animation: linear 2s linear`, whether a `linear` is the easing function or the
name of the animation depends on the order the value is matched in, so neither
is touched.

It works for `@keyframes`, `@counter-style`, custom `counter` values and grid area definitions. See the
[documentation][idents] for more information, or the [tests](../../test/postcss-reduce-idents/) for more
examples.


## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).


## License

MIT © [Ben Briggs](https://beneb.info)

[idents]:  https://developer.mozilla.org/en-US/docs/Web/CSS/custom-ident

[postcss]: https://github.com/postcss/postcss

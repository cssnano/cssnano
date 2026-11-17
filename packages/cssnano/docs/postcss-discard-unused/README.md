# [postcss][postcss]-discard-unused

> Discard unused counter styles, keyframes and fonts.


## Install

This plugin is part of `cssnano` and is no longer published as a separate package. It runs in the `cssnano` presets; see the [presets documentation](https://cssnano.github.io/cssnano/docs/presets/) to configure it.

## Example

This module will discard unused at rules in your CSS file, if it cannot find
any selectors that make use of them. It works on `@counter-style`, `@keyframes`,
`@font-face` and `@namespace`.

A counter style stays when `list-style` names it, when `counter()`,
`counters()`, `target-counter()` or `target-counters()` names it in `content`,
`bookmark-label` or `copy-into`, or when a counter style in use extends it or
names it in `fallback` or `speak-as`. A name matches however it is escaped,
and a predefined name such as `lower-roman` in any case. If one of those
declarations uses a substitution function such as `var()`, `env()`, or an
`attr()` with a fallback or a type that yields an identifier, every counter
style stays, since the substituted value may name one.

### Input

```css
@counter-style custom {
    system: extends decimal;
    suffix: "> "
}

@counter-style custom2 {
    system: extends decimal;
    suffix: "| "
}

a {
    list-style: custom
}
```

### Output

```css
@counter-style custom {
    system: extends decimal;
    suffix: "> "
}

a {
    list-style: custom
}
```

Note that this plugin is not responsible for normalising font families, as it
makes the assumption that you will write your font names consistently, such that
it considers these two declarations differently:

```css
h1 {
    font-family: "Helvetica Neue"
}

h2 {
    font-family: Helvetica Neue
}
```

However, you can mitigate this by including [postcss-minify-font-values][mfv]
*before* this plugin, which will take care of normalising quotes, and
deduplicating. For more examples, see the [tests](../../test/postcss-discard-unused/).


## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT © [Ben Briggs](https://beneb.info)


[postcss]: https://github.com/postcss/postcss
[mfv]:     https://github.com/cssnano/cssnano/tree/main/packages/cssnano/docs/postcss-minify-font-values

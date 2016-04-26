# PostCSS Discard Overridden [![Build Status][ci-img]][ci]

[PostCSS] plugin to discard overridden @keyframes or @counter-style..

[PostCSS]: https://github.com/postcss/postcss
[ci-img]:  https://travis-ci.org/Justineo/postcss-discard-overridden.svg
[ci]:      https://travis-ci.org/Justineo/postcss-discard-overridden

```css
.foo {
    /* Input example */
}
```

```css
.foo {
  /* Output example */
}
```

## Usage

```js
postcss([ require('postcss-discard-overridden') ])
```

See [PostCSS] docs for examples for your environment.

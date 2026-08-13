---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): stop dropping part of a `columns` shorthand

`columns: 2` was rewritten to `column-count: 2`. That is not the same
declaration: the shorthand also sets `column-width` back to `auto`, and the
longhand on its own leaves whatever another rule set in place.

```css
.wide { column-width: 12em }
.wide.narrow { columns: 2 }
```

An element in both classes should get automatic column widths. After
minification it kept 12em ones. `columns: 2 auto` was affected the same way, as
the trailing `auto` was read as a second count rather than as the width.

`columns: 30em / 10em`, the form that also sets a column height, was rewritten
to `columns: 30em /`, which no browser can parse, so the declaration was lost
outright. That form now passes through untouched, and a value that cannot be
split up with certainty, such as `columns: calc(2em + 1px)`, is left alone
rather than guessed at.

If a stylesheet sets `column-height` anywhere, `column-width` and `column-count`
are no longer merged into a `columns` shorthand, which would have reset it.

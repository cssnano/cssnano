---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): stop breaking `revert-rule`, and merge borders that use modern colour functions

A declaration using `revert-rule` was merged into a shorthand that browsers then
threw away, taking the other longhands with it:

```css
.a {
  margin-top: revert-rule;
  margin-right: 0;
  margin-bottom: 0;
  margin-left: 0;
}
```

became `.a{margin:revert-rule 0 0}`. A CSS-wide keyword cannot be combined with
other values in a shorthand, so the whole declaration was invalid and the
element lost all four margins. Such a declaration is now left alone, as one
using `revert` or `inherit` already was.

Borders whose colour comes from `lab()`, `oklab()`, `oklch()`, `color-mix()`,
`light-dark()` or any other colour function added since `rgb()` were not always
recognised as having a colour, and missed merges the same border made with
`rgb()`. They now merge:

```css
/* before: left as four declarations */
.a {
  border-top: solid color-mix(in srgb, red, blue);
  border-right: solid color-mix(in srgb, red, blue);
  border-bottom: solid color-mix(in srgb, red, blue);
  border-left: solid color-mix(in srgb, red, blue);
}

/* now */
.a {
  border-color: color-mix(in srgb, red, blue);
  border-style: solid;
  border-width: medium;
}
```

A function whose name merely ends in that of a colour function, such as
`my-rgb()`, is no longer mistaken for a colour.

Both were hand-maintained lists that had fallen behind their specifications.
They, along with the longhands of each shorthand and their initial values, are
now generated from the specifications themselves, so they stay current as CSS
gains keywords and functions.

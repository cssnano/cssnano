---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

feat(postcss-merge-longhand): minify a border built from a reset and overrides

A rule that resets `border` and then sets two or more of `border-width`,
`border-style` and `border-color` alongside a per-side property was left
untouched, because the transforms take the declarations a pair at a time and
cannot see what the whole set computes to:

```css
/* before */
button {
  color: blue;
  border: none;
  border-left: solid;
  border-color: grey;
  border-width: 2px;
}
```

The five declarations compute to a `2px` grey border that is drawn on the left
only, and are now written as that:

```css
/* now */
button {
  color: blue;
  border: 2px grey;
  border-left-style: solid;
}
```

The rule is left alone unless it can be resolved whole: no `border-image`, no
flow-relative property, no custom property, no hack, no support gate, one
`!important` flag throughout, and a result that is actually shorter.

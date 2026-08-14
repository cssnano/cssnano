---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): stop merging declarations that reached different browsers

A shorthand is read whole or thrown away whole, so the parts folded into one
have to have applied to the same browsers. Where a value used `env()`,
`constant()`, `var()` or a colour function like `oklch()`, the parts around it
did not, and merging handed the lot to the narrower audience:

```css
/* before */
.a {
  padding: env(safe-area-inset-top) 3px 1px;
  padding-top: 1px;
}
```

became `.a{padding:1px 3px}`. A browser that does not know `env()` used to skip
the first declaration and take `padding-top: 1px` on its own, leaving the other
three sides at `0`; afterwards it read the merged shorthand and gained `3px` on
the sides and `1px` at the bottom. Now the rule is left as it was written.

The same went for a box built up in layers:

```css
/* before */
.a {
  padding-top: 1px;
  padding-right: 1px;
  padding-bottom: 1px;
  padding-left: 1px;
  padding-top: 2px;
  padding-right: 2px;
  padding-bottom: 2px;
  padding-left: env(safe-area-inset-left);
}
```

became `.a{padding:2px 2px 2px env(safe-area-inset-left)}`, which a browser
without `env()` drops entirely, falling back to `1px` on all four sides instead
of the `2px` the stylesheet asks for on three of them. It is now
`.a{padding:2px 2px 2px 1px;padding-left:env(safe-area-inset-left)}`, which
computes to the same thing with `env()` and without it.

The cost is that a modern colour function next to a plain value no longer draws
the two together: `.a{border-color:red;border-top-color:oklch(0.7 0.1 20)}`
stays as written rather than becoming
`.a{border-color:oklch(0.7 0.1 20) red red}`, which took `red` away from the
three sides that kept it in a browser without `oklch()`. Values written with
`rgb()`, `rgba()`, `hsl()` and `hsla()` merge as freely as before.

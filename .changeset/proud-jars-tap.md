---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): keep the longhand a gated shorthand does not reach

A shorthand overrides the longhands before it only in the browsers that keep
it, so one behind a support gate leaves them standing everywhere else:

```css
/* before */
h1 {
  border-left-color: red;
  border: 1px solid env(x);
}
```

became `h1{border:1px solid env(x)}`, and a browser that does not know `env()`
lost the red left border it used to draw. The earlier declaration now stays.

Rules like these are rewritten under a check that they came back together
again, rather than under a check that they did not get longer. A rewrite that
strands a fallback can be a byte shorter than the rule it replaces, and one
that was is what let the first example through.

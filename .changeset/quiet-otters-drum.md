---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): improve shorthand merging correctness

Reject merges producing invalid values for `border`, `margin`, or `padding`; prevent math functions from standing in for border styles or colors; preserve fallback declarations before unresolved values like `env()` or `calc()`; correctly weight `!important`; and stop resurrecting declarations overridden elsewhere.

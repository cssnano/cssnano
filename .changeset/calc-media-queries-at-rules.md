---
"cssnano": patch
---

fix(cssnano): postcss-calc's `mediaQueries` option reduces only `@media` and `@container` preludes

With `mediaQueries` on, postcss-calc reduced the prelude of every at-rule, so a `calc()` in an `@supports` condition or an `@import` `supports()` was rewritten. A reduced `abs()` can pass a feature test that the original fails, so those conditions are now left unchanged.

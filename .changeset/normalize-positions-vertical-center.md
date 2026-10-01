---
"postcss-normalize-positions": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Preserve vertical keywords when dropping `center` from two-value positions. `top center` and `bottom center` now become `top` and `bottom` instead of the horizontal coordinates `0` and `100%`, and `center top` and `center bottom` are shortened to `top` and `bottom` too.

Leave `background` layers untouched when position keywords or coordinates are split by another component, such as `left no-repeat center`. Such layers are invalid, and rewriting them could drop the other component or make the browser accept the declaration.

Leave a layer untouched when it contains an arbitrary substitution function such as `attr()`, `if()`, `inherit()` or a custom `--function()`, as already done for `var()`. These may supply a position keyword, so `center attr(…)` is no longer rewritten to `50% attr(…)`, which is invalid if `attr()` yields `left`.

Treat every math function, such as `round()` or `abs()`, as a position term like `calc()`. An invalid three-term position such as `round(10px, 1px) center top` is no longer shortened into a valid one.

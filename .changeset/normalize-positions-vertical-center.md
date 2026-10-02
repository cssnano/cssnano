---
"postcss-normalize-positions": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Shorten `top center` and `bottom center` to `top` and `bottom`, instead of `0` and `100%`, which the browser reads as horizontal positions. `center top` and `center bottom` are now shortened the same way.

Leave a position unchanged when it cannot be safely rewritten:

- in a `background` layer where another value splits the position, as in `left no-repeat center`, which is invalid;
- when it contains a function such as `attr()`, `if()` or a custom `--function()`, which may return a keyword, as `var()` already did;
- when an invalid three-value position contains a math function, such as `left abs(1px) top`, as `calc()` already did.

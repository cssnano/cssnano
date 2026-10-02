---
"postcss-minify-font-values": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Leave the `font` shorthand unchanged when it contains `attr()`, `if()`, `inherit()` or a custom function such as `--name()`, as already done for `var()` and `env()`. Their result is only known when the browser computes the value.

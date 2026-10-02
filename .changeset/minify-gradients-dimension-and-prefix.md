---
"postcss-minify-gradients": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Remove a zero color stop position only when it has the right type for the gradient. `conic-gradient()` now drops `0deg` and keeps an invalid `0px`, while linear and radial gradients still drop `0px`. `-webkit-linear-gradient()` keeps `to bottom` and other `to` directions as written, since the prefixed syntax measures angles differently.

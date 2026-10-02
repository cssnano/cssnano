---
"postcss-minify-font-values": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Only treat a dimension as the font size in the `font` shorthand when it has a length unit. An invalid value such as `font:bold 1s "Arial Black"` is now left unchanged.

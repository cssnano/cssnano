---
"postcss-minify-font-values": patch
---

Only treat a dimension as a `font-size` when its unit is a CSS length unit. A `font` shorthand with another dimension, such as `bold 1s "Arial Black"`, is now left unchanged instead of having its font family computed from the wrong position.

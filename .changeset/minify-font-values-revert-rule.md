---
"postcss-minify-font-values": patch
---

Keep `"revert-rule"` quoted in `font-family`. Unquoted, it is the CSS-wide keyword of css-cascade-6 rather than a family name.

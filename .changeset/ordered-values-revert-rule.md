---
"postcss-ordered-values": patch
---

Treat `revert-rule` as a CSS-wide keyword. `postcss-ordered-values` no longer reorders a `border`, `animation`, `transition`, `list-style`, `box-shadow` or `grid-row` value as if `revert-rule` were a color, name or type. The reserved keywords are now generated from `@webref/css`.

---
"postcss-merge-rules": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-rules): decide property conflicts from spec data

Whether two declarations can be reordered is now decided using `@webref/css` data instead of a name-based heuristic. For example, the plugin now recognizes that `font` and `line-height`, `border-width` and `border-left`, `gap` and `row-gap`, and `inset` and `top` conflict, and that a flow-relative property and its physical counterpart override each other.

Properties that merely share a name segment, such as `flex` and `flex-direction`, are no longer held apart, so some rules merge that did not before. Vendor extensions no spec describes still fall back to comparing names.

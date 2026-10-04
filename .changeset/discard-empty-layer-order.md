---
"postcss-discard-empty": patch
"cssnano-preset-lite": patch
"cssnano-preset-default": patch
---

Keep an empty `@layer` block when it may fix the layer order: an earlier block or statement for the same layer only counts when it is at top level or inside a condition that also encloses the empty block. `@layer` names are now compared after CSS escape decoding, and a `@layer` prelude that is invalid per CSS Cascade 5 is treated as declaring no layer.

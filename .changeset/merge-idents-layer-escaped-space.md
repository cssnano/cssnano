---
"cssnano": patch
---

fix(cssnano): merge-idents reads `@layer a\  {}` as the layer `a ` that `@layer a\20 {}` names

A block whose name ends in an escaped space, such as `@layer a\  {}`, was read as the name `a�`, so it was a different layer from `@layer a\20 {}`. PostCSS keeps the escaped space in `raws.between` rather than in the layer's params, and the layer reader now reads the prelude with that space, as merge-idents already does for keyframes and counter styles.

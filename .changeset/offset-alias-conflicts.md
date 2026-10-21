---
"cssnano": patch
---

fix(cssnano): `offset-block-*` and `offset-inline-*` are compared with the `inset-*` properties they alias

`.a{inset-block-start:0}.b{offset-block-start:1px}.a{inset-block-start:2px}` is no longer merged into `.a{inset-block-start:0;inset-block-start:2px}.b{offset-block-start:1px}`, which changed the value of `inset-block-start` on an element matching both rules in browsers that spell the flow-relative insets with `offset-`.

Merges across `offset-block-*` and `offset-inline-*` and the Motion Path `offset`, `offset-path`, `offset-distance`, `offset-position`, `offset-anchor` and `offset-rotate` properties, or the `place-content`, `place-items` and `place-self` properties, are no longer blocked, since none of those sets an inset.

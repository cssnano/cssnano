---
"cssnano": patch
---

fix(cssnano): ignore the names of a block `@layer` with a name list

A block `@layer` takes at most one name, so browsers drop `@layer x, y{…}`. mergeIdents still used it to order `x` and `y`, so a later `@layer y, x;` could be overruled and the wrong repeat `@keyframes` or `@counter-style` kept. Such a block now declares no layer.

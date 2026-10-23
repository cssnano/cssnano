---
"cssnano": patch
---

fix(cssnano): mergeIdents keeps definitions in different layers apart when the stylesheet has an `@import`

An imported stylesheet can declare cascade layers before the importing one, as `@import url(x.css) layer(x)` does, so the layer order is not known from the importing stylesheet alone. mergeIdents assumed the order of its `@layer` rules, so it could merge two `@keyframes` or `@counter-style` names that resolve to different definitions, or remove a repeat definition that won the cascade. In a stylesheet with an `@import`, it now merges names and removes repeat definitions only within one layer.

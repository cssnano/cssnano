---
"cssnano": patch
---

fix(cssnano): an at-rule name folds ASCII case only, so `@` followed by a Kelvin sign is not `@keyframes` and is not discarded as overridden

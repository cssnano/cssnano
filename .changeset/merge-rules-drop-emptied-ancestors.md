---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Remove the enclosing named `@layer` and conditional blocks that moving a rule out of a nested conditional group rule leaves empty, instead of leaving an empty `@layer x{}` behind.

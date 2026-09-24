---
'postcss-ordered-values': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Orders `columns: 2 auto` as `columns: auto 2`. Leaves animation declarations with negative iteration counts unchanged. Reorders border and box-shadow math functions that resolve to a length, such as `calc(1px + 1em)`, and leaves other math unchanged. Passes through unknown box-shadow color functions instead of reordering them.

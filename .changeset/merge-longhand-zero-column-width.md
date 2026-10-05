---
"postcss-merge-longhand": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Merge `column-width` and `column-count` into `columns` when the width is zero, for example `column-width:0px;column-count:2` becomes `columns:0px 2`. CSS Sizing 4 allows a zero `column-width`; a zero `column-count` stays invalid and is left untouched.

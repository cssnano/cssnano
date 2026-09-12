---
"postcss-merge-longhand": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Preserve matching-importance all reset boundaries when merging margin, padding, physical border-radius, and columns declarations, so minification does not restore values cleared by the reset.

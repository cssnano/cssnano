---
'postcss-merge-longhand': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Require positive integer column counts and validated lengths in columns shorthands and longhands to prevent invalid shorthands from exploding, merging, or discarding valid fallback declarations.

---
'postcss-merge-longhand': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Unify physical-border optimization under a single reducer that chooses deterministic shortest non-crossing canonical shorthands from complete side and component groups, partitioned by importance lane. Partial grids no longer require a full border reset. Dynamic declarations, style hacks, CSS-wide keywords, support fallbacks, unresolved substitutions, and other cascade barriers remain in their original positions, while valid fallback and border-image behavior is preserved.

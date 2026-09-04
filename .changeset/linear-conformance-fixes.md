---
'postcss-merge-rules': patch
'postcss-ordered-values': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Improve conformance for modern CSS math functions, grid-line values, and case-sensitive attribute selector modifiers while preserving ambiguous or invalid declarations. The affected transforms now use bounded, linear scans for these forms.

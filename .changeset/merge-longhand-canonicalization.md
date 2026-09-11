---
'postcss-merge-longhand': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Standardize output normalization for margin, padding, and physical border properties. Property names and case-insensitive keywords in generated shorthands and normalized standalone shorthand declarations are canonicalized to lowercase, while preserving author casing for unmerged longhands, custom properties, hack prefixes, and unresolved values.

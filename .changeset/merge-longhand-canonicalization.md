---
'postcss-merge-longhand': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Standardize output normalization for margin, padding, and physical border properties. Standard property names and case-insensitive keywords are canonicalized to lowercase, while preserving exact author casing for custom properties, hack prefixes, and unresolved values.

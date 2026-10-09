---
"postcss-normalize-whitespace": patch
"cssnano-preset-lite": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

fix(postcss-normalize-whitespace): trim and collapse spaces and tabs between the names of each string row in `grid-template-areas`, `grid-template` and `grid`. Rows that contain a backslash, unclosed strings, and whitespace-only rows are left unchanged.

---
'postcss-merge-longhand': patch
'postcss-minify-font-values': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Parse font weights and column units from tokenizer metadata. This safely minifies escaped `bold` weights, recognizes escaped length units, and prevents partial rewrites of invalid font shorthands while preserving original source spelling.

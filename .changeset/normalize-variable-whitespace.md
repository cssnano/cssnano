---
"postcss-normalize-whitespace": patch
"cssnano-preset-default": patch
"cssnano-preset-lite": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Remove insignificant whitespace around custom-property names, `env()` custom-ident arguments, and comma delimiters in `var()`, `env()`, and `constant()` in standard declarations. Required whitespace between distinct tokens and the single whitespace token in an empty fallback remain preserved. Custom-property declaration values remain unchanged to preserve exact CSSOM serialization.

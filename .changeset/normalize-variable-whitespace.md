---
"postcss-discard-comments": patch
"postcss-normalize-whitespace": patch
"cssnano-utils": patch
"cssnano-preset-default": patch
"cssnano-preset-lite": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Remove insignificant whitespace around custom-property names and, in standard declarations, around `env()` custom-ident arguments and around comma delimiters in `var()`, `env()`, and `constant()`. Between a custom-property name and its value, only the parser-consumed leading whitespace run is dropped; authored whitespace elsewhere in the value, such as after a preserved comment, is preserved per CSS Variables 1. Required whitespace between distinct tokens and the single whitespace token in an empty fallback remain preserved, and a preserved comment kept between a declaration name and value now survives minification, for custom properties and standard declarations alike. Comment removal in selectors and values no longer fuses the tokens the comment sat between: an attribute case-insensitivity flag or any other name-like token keeps its boundary, and math-operator spacing is restored for every function whose value productions accept `<calc-sum>` arguments (including `calc-size()`, `calc-mix()`, and `random()`). Values without comments are now left byte-for-byte untouched rather than re-spaced.

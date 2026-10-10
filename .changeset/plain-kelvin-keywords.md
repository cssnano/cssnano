---
"postcss-minify-selectors": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-minify-selectors): match escaped pseudo-class and pseudo-element names ASCII-case-insensitively, so U+212A KELVIN SIGN no longer folds to `k`. This covers escaped pseudo names, `:nth-*` keywords such as `of`, `odd` and `even`, `from` in keyframe selectors, and `url()` in namespace rules

---
"postcss-minify-selectors": patch
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Keep a compound selector that contains a comment, such as `.a/**/.b` inside `:is()`, instead of dropping it as invalid.

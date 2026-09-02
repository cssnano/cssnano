---
"postcss-minify-selectors": patch
"cssnano-preset-default": patch
---

Folds more selector lists into safe `:is()` expressions when their selectors contain nested comma-separated functions, while preserving selector order and conservative specificity and namespace checks.

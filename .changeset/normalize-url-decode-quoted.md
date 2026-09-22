---
"postcss-normalize-url": patch
"cssnano-preset-default": patch
"cssnano": patch
---

`postcss-normalize-url` now decodes quoted `url(...)` values, preserving literal backslashes and escape sequences whether quotes are stripped or kept.
Relative URLs now normalize using POSIX path semantics across all platforms, and converted `@namespace` URLs escape double quotes.

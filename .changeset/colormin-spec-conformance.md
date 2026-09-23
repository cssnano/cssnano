---
"postcss-colormin": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Restricts color minification to CSS properties that accept `<color>` and custom properties, preserving custom identifiers in properties like `animation-name`, `grid-area`, and `counter-reset`. Adds support for `hwb()` color values and minification inside `color-mix()`, `light-dark()`, and `var()` fallbacks, while preserving relative color syntax, math functions, and token boundary separators.

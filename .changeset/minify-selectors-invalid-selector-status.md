---
"postcss-minify-selectors": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Leave rules with an invalid selector unchanged, including an ID selector that starts with a digit, such as `#1a`, and a combinator after a pseudo-element, such as `a::before b`.

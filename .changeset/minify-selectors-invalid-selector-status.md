---
"postcss-minify-selectors": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Report an ID selector whose hash is not an identifier (`#1a`) and a pseudo-element followed by a combinator (`a::before b`) as invalid. They are left as written instead of being normalized.

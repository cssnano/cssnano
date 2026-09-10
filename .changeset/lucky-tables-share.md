---
"cssnano-utils": minor
"postcss-convert-values": patch
"postcss-merge-longhand": patch
"postcss-minify-params": patch
"postcss-normalize-whitespace": patch
"postcss-ordered-values": patch
"cssnano-preset-default": patch
"cssnano-preset-lite": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Value transforms now read the CSS Values 4 math function names from one `mathFunctions` table in `cssnano-utils`, so unit retention, box and shorthand merging, parameter and whitespace handling, and time classification agree on which functions count as math functions. Serialized output is unchanged.

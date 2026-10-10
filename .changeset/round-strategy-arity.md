---
"postcss-merge-longhand": patch
"postcss-ordered-values": patch
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

fix: accept the optional leading rounding strategy of `round()`, such as `round(up, 1s, 1s)`, when postcss-ordered-values orders animations and transitions and when postcss-merge-longhand folds shorthands. A rounding strategy must stand alone as the first argument, so `round(up 1px, 2px)` is no longer treated as valid. postcss-merge-longhand no longer folds math functions whose values are not joined by operators, such as `calc(1px 2px)`. postcss-merge-longhand, postcss-ordered-values and postcss-merge-rules now compare property names, keywords and units ASCII-case-insensitively, so a Kelvin sign no longer matches `k`.

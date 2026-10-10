---
"postcss-merge-longhand": patch
"postcss-ordered-values": patch
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

fix: accept the optional leading rounding strategy of `round()`, such as `round(up, 1s, 1s)`, when postcss-ordered-values orders animations and transitions and when postcss-merge-longhand folds shorthands. postcss-merge-rules now compares at-rule names ASCII-case-insensitively, so a Kelvin sign no longer matches `k`.

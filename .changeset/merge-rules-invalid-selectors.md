---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Stop merging rules whose selectors are invalid, such as `b: hover`, `b:::before`, `[x~ =y]`, `[x=y z]` and `[a b]`. Merging them with a valid rule made the whole selector list invalid, so browsers dropped the valid rule too.

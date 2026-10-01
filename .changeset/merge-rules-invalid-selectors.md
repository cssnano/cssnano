---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Stop merging rules whose selectors are invalid, such as `b: hover`, `b:::before`, `[x~ =y]`, `[x=y z]`, `[a b]`, `+n`, `:lang(en fr)`, `a*`, `:nth-child(foo)`, `#1a`, `a::before b` and `a||b`. Merging them with a valid rule made the whole selector list invalid, so browsers dropped the valid rule too.

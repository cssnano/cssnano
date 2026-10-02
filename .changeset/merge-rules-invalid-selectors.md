---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Stop merging rules that have an invalid selector, such as `b: hover`, `[a b]`, `:lang(en fr)` or `a||b`. An invalid selector makes the whole selector list invalid, so the browser also dropped the valid rule it was merged with.

---
"postcss-ordered-values": patch
"cssnano-preset-default": patch
---

Fix ordered-value caching so the same shorthand value is reduced according to each property’s syntax. This prevents a cached result from one property from changing the output of another while retaining cache benefits for repeated values handled by the same reducer.

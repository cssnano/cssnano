---
'postcss-reduce-idents': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Rename identifiers only when their definition and a reference share a stylesheet; leave alone names inside `var()`, `env()`, `attr()`, or a custom property fallback; skip reserved words in the encoder; rename `reversed()` counters and implicit `<area>-start`/`-end` lines with their area.

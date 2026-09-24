---
'cssnano-preset-advanced': patch
'postcss-reduce-idents': patch
---

`postcss-reduce-idents` no longer rewrites whitespace inside `counter()`, `counters()` and the other counter functions of a declaration it passes through unchanged. Extra spacing between the arguments now only normalizes when a counter in the same declaration renames, so undefined counters keep the value exactly as written.

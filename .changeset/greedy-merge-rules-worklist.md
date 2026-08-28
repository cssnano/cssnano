---
'postcss-merge-rules': patch
---

Use deterministic greedy scheduling when considering safe adjacent rule merges. This can produce smaller valid CSS than the previous streaming order.

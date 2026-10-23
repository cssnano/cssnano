---
"cssnano": patch
---

feat(cssnano): merge-rules joins a rule into an earlier one when the join breaks even

A later rule that repeats a declaration of an earlier rule now gives it up and adds its selector to the earlier rule even when this saves no bytes by itself. The repeated declaration then no longer stands between the earlier rule and further rules, which can join it and shorten the output.

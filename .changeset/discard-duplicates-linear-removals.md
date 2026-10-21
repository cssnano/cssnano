---
"cssnano": patch
---

fix(cssnano): discardDuplicates removes many duplicates in linear time

Each removed duplicate made PostCSS scan its parent's children, so a rule or stylesheet with many duplicates still took quadratic time. Removals are now collected and each block is rebuilt once. The output is unchanged.

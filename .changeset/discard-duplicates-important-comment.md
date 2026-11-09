---
'cssnano': patch
---

fix(cssnano): discardDuplicates no longer removes a block that differs from a later one only in the text of an important comment

A block with an important comment such as `/*! a */` is compared by that text, so two such blocks are both kept.

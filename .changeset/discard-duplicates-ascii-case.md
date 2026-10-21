---
"cssnano": patch
---

feat(cssnano): discardDuplicates treats property names that differ only by ASCII case as the same property

A declaration such as `COLOR:red` after `color:red` is now removed as a duplicate. Custom properties stay case-sensitive, so `--Foo` and `--foo` are both kept.

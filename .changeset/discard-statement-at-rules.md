---
"cssnano": patch
---

fix(cssnano): keep a statement at-rule and a block at-rule with the same prelude

discardDuplicates treated `@foo x;` and `@foo x{…}` as equal, so the earlier one was removed when a later one followed it. Those are different constructs, so both are now kept.

---
"cssnano": patch
---

fix(cssnano): an item that ends in a backslash before a newline stays invalid

A selector or at-rule prelude ending in `\` before a newline is invalid. cssnano rewrote its newline as a space, which escapes the space and makes it valid, and it let a later list with the same item inherit that valid reading. The newline and the invalid reading are now kept. cssnano also no longer deduplicates or reorders a selector list that has such an item, no longer merges `@layer a\` followed by a newline with `@layer a\` followed by a space, and keeps the newline when it removes a comment after the backslash, in a selector or an at-rule prelude.

---
"cssnano": patch
---

fix(cssnano): normalize-whitespace keeps the whitespace after `\9` that separates two components

The space after a `\9` escape ends the escape. Dropping it turned `1px\9 a` into `1px\9a`, which reads as the character U+009A, and dropping the whitespace after it joined two components, so `1px\9  solid` became `1px\9solid`. Both are now kept. The whitespace is still removed before a delimiter such as `,` or `!`, and at the end of the value. The preset snapshot is unchanged.

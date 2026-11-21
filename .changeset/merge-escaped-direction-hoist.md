---
"cssnano": patch
---

fix(cssnano): hoist an escaped `direction` or `unicode-bidi` declaration past a later `all`

`all` does not reset `direction` or `unicode-bidi`, but the merge pass compared the raw spelling of the property, so `a{\64irection:rtl}b{\64irection:rtl;all:initial}` kept the escaped declaration in both rules. The escaped name is now read as `direction`, so the declaration is hoisted like the unescaped one.

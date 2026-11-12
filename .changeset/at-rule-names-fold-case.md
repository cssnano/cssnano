---
"cssnano": patch
---

fix(cssnano): an at-rule whose name differs from a later one only by ASCII case is treated as the same at-rule

At-rule names are ASCII case-insensitive, but the merge pass kept `@Foo` and `@foo` as two at-rules when it discarded duplicates. The earlier one is now removed, as it is for any other repeated at-rule.

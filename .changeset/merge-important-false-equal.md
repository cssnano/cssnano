---
"cssnano": patch
---

fix(cssnano): join rules whose declarations differ only in an `important: false` flag

Rule merging treated a declaration that longhand created with `important: false` as different from the same declaration without the flag, although both print without `!important`. A rule of four radius longhands now joins a `border-radius` rule with the same value, and rule merging keeps a `margin: 0` that a later rule with the same declaration had dropped.

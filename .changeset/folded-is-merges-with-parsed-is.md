---
"cssnano": patch
---

fix(cssnano): a folded `:is()` now merges with an identical parsed `:is()`

A selector whose `:is()` came from an earlier fold did not share a prefix or suffix with a later selector that spelled the same `:is()` in its source, so the later fold was missed. The two now group together.

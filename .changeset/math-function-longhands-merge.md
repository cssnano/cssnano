---
"cssnano": patch
---

fix(cssnano): merge longhands that use math functions when every target parses them

With explicit browser targets, a longhand set with a math function such as `clamp()`, `min()`, `max()`, `round()`, `mod()` or `rem()` in a box property stayed unmerged, although every target parses the function. Targets such as Chrome 79, Firefox 75 and Safari 13.1 now merge the longhands for `min()`, `max()` and `clamp()`, as they already did for `calc()`. `round()`, `mod()` and `rem()` need Chrome 125, Firefox 118 and Safari 17.2, and `abs()` needs Chrome 138, Firefox 118 and Safari 15.4, so the longhands merge only for targets at or above those versions.

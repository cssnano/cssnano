---
"cssnano": patch
---

fix(cssnano): no declaration moves past a write of another property when the property data does not describe one of the two, so a vendor-prefixed property no longer lets a later or earlier declaration of a known property overtake it

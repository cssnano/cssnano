---
"cssnano": patch
---

fix(cssnano): keep `anchor-size()` inset sides unshortened

`inset: anchor-size(width) 1px anchor-size(width) 1px` is no longer shortened to `inset: anchor-size(width) 1px`. The sides keep their written form, so the output is a few bytes longer with the same meaning.

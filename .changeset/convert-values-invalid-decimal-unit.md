---
"cssnano": patch
---

fix(cssnano): convert-values keeps a dot before a unit, such as `1.em` or `10.px`

A number followed by a dot and a unit is invalid CSS, but convert-values read it as the valid number with the unit, so `width:1.em` became `width:1em` and `calc(10.px + 0px)` became `calc(10px + 0px)`. These values now stay as written, so a browser keeps ignoring them as it does in the source.

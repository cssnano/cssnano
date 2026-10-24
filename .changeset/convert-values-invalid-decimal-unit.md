---
"cssnano": patch
---

fix(cssnano): convert-values keeps a dot after a number, such as `1.`, `1.em` or `10.px`

A number followed by a dot is invalid CSS, but convert-values read it as the valid number, so `opacity:1.` became `opacity:1`, `width:1.em` became `width:1em` and `calc(10.px + 0px)` became `calc(10px + 0px)`. These values now stay as written, so a browser keeps ignoring them as it does in the source.

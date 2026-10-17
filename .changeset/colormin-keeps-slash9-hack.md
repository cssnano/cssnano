---
"cssnano": patch
---

fix(cssnano): keep colors that carry an escape hack such as `\9` or `\0/`

Colormin now leaves a color unchanged when an escape, such as the old IE `\9`, `\0` or `\0/` hack, ends or directly follows it. Any identifier that starts with an escape and directly follows a color function, such as `rgb(255,0,0)\41`, also keeps the color unchanged. It used to drop the escape from keywords, so `red\9` became `red`, a value every browser applies, and it split the hack from a color function, writing `rgb(255,0,0)\9` as `red \9`.

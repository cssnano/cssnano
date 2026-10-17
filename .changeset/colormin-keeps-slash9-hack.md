---
"cssnano": patch
---

fix(cssnano): keep colors that carry an escape hack such as `\9` or `\0/`

Colormin leaves a color unchanged when an escape hack, such as the IE `\9`, `\0` or `\0/`, ends or directly follows it. This includes an identifier after a color function, such as `rgb(255,0,0)\41`. Before, `red\9` became `red`, which every browser applies, and `rgb(255,0,0)\9` became `red \9`.

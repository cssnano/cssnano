---
"cssnano": patch
---

fix(cssnano): zindex leaves a z-index value with more than one component as written

`z-index: 100 200` and `z-index: 1/*c*/00` are invalid and browsers ignore them, but zindex rewrote them to a valid number, which changed how the page renders.

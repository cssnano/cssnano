---
"cssnano": patch
---

fix(cssnano): reduce-transforms keeps the text after a reduced function whose argument also reduces

`transform: scale(scale(2,1), 1) translate(0)` became `scaleX(scale(2,1))translate(0)`: the inner reduction shortened the text before the outer one was applied with its original offsets, so the space after the outer function was lost. Only the outer reduction now applies, and the value becomes `scaleX(scale(2,1)) translate(0)`.

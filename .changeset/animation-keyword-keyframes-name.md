---
"postcss-ordered-values": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Leave `animation` untouched when the keyframes name is a keyword another longhand would claim, such as `animation: ease 1s linear`. Reordering the name first made browsers read it as the timing function, direction, fill mode or play state.

---
"cssnano": patch
---

fix(cssnano): minify a selector list whose duplicate items leave one selector

A selector list such as `.a,\n.a` or `.a.b, .a.b` now minifies to its one remaining selector, `.a` or `.a.b`. It stayed unchanged before.

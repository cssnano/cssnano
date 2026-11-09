---
'cssnano': patch
---

fix(cssnano): merge removes a declaration that repeats a later one after a stray semicolon

A stray `;` before a declaration is no longer read as a browser hack, so `a{zoom:1;;zoom:1}` keeps one `zoom:1`.

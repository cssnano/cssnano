---
'cssnano': patch
---

fix(cssnano): merge keeps a value's important comment, such as `/*! k */`, as written

A longhand is not folded, rewritten or removed when its value holds an important comment, and no shorthand is merged across it. Before, `margin:0 /*! k */ 1px` became `margin:0 1px` and `margin-top:1px /*! k */;margin-top:2px` became `margin-top:2px`, losing the comment. A plain comment in a value still goes when the value is rewritten.

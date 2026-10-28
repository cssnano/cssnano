---
"cssnano": patch
---

fix(cssnano): the merge pass keeps an important comment beside whitespace in a selector

PostCSS keeps a selector comment that has whitespace beside it only in the raw selector, so a merge that rebuilt the selector from `rule.selectors` lost it: `c{color:red;margin:0}a /*!x*/,b{color:red;margin:0;top:0}` became `a,b,c{color:red;margin:0}a,b{top:0}`. The walk now moves such comments into the selector, and the output is `a /*!x*/,b,c{color:red;margin:0}a /*!x*/,b{top:0}`.

---
"cssnano": patch
---

fix(cssnano): list a selector both rules share once in a partial merge

`.a,.b{color:red;top:0}.a,.c{color:red;left:0}` now becomes `.a,.b{top:0}.a,.b,.c{color:red}.a,.c{left:0}`, where the previous output kept both rules.

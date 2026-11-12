---
'cssnano': patch
---

fix(cssnano): merge keeps a declaration whose value has an important comment, such as `/*! k */`, apart from the same value without it

Rule merging and duplicate discarding compare a declaration by its value as written when that holds an important comment, so `color:red/*! k */;` is no longer treated as `color:red`. Before, `a{color:red/*! k */;}b{color:red}` became `a,b{color:red}`, losing the comment.

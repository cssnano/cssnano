---
"cssnano": patch
---

fix(cssnano): discard-unused keeps a namespace whose prefix is followed by a comment

A comment between a namespace prefix and `|` reset the prefix, so `@namespace ns url(x);ns/**/|a{}` lost its `@namespace` and the selector no longer had a declared namespace. Comments are removed before parsing, so the prefix is now kept and the output is `@namespace ns url(x);ns/**/|a{}`.

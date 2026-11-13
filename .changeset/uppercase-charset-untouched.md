---
"cssnano": patch
---

fix(cssnano): an `@CHARSET` that is not written in lowercase is left as it is

Browsers read an encoding only from the exact lowercase `@charset` bytes, so any other case is an unknown at-rule. The charset normalization no longer removes it, moves it or rewrites it to lowercase, which would have turned an ignored rule into a live encoding declaration.

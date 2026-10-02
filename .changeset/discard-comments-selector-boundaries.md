---
"postcss-discard-comments": patch
"cssnano-preset-default": patch
"cssnano-preset-lite": patch
---

Stop turning a comment inside a selector into a descendant combinator. A comment is not whitespace, so `div/*c*/span` is not the same selector as `div span`. It now becomes `div/**/span` instead. Comments that can be removed without joining two tokens are still removed, so `.a/*c*/.b` becomes `.a.b`.

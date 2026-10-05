---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Do not merge nested rules when a conflicting declaration from the enclosing rule lies between them, so `.p{&{color:red}color:blue;&{color:red}}` stays red instead of blue.

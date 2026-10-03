---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Keep nested rules apart when a declaration of the enclosing rule lies between them. CSS Nesting applies such a declaration in source order, so `.p{&{color:red}color:blue;&{color:red}}` stays red instead of turning blue.

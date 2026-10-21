---
"cssnano": patch
---

fix(cssnano): mergeRules keeps a hacked declaration apart from the same property without the hack

A declaration such as `_height:1px` or `*zoom:1` is no longer merged with `height` or `zoom` on another rule. Modern browsers ignore the hack, so the merge would apply the property to the rules it was moved to.

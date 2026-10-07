---
"postcss-merge-longhand": minor
"cssnano-preset-default": minor
"cssnano-preset-advanced": minor
"cssnano": minor
---

feat(postcss-merge-longhand): discard overridden same-property declarations

Within a rule, a declaration is dropped when a later declaration of the same property and the same `!important` overrides it, and every browser that accepts the earlier value must also accept the later one. The values may differ only in numbers and hex colours, so `top:1px;top:2px` becomes `top:2px`, while `color:red;color:blue` and a later value with a newer unit, function or scientific notation stay as fallbacks. An `all` declaration ends the comparison.

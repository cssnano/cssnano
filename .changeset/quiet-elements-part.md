---
"postcss-merge-rules": patch
"cssnano": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
---

fix(postcss-merge-rules): join rules and equal at-rule blocks across a rule that writes the same property to a different element, when every selector in the moved and crossed rules ends in a type selector with no class, id, attribute or pseudo-class

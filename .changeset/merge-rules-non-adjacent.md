---
"postcss-merge-rules": minor
"cssnano-preset-default": minor
"cssnano-preset-advanced": minor
"cssnano": minor
---

Merge rules with the same selector and sibling `@media`, `@supports` and `@container` blocks with identical conditions even when other rules sit between them, when none of those rules sets a conflicting property.Do not merge rules across `all`, shorthands that reset their longhands, logical properties that can address the same side, and at-rules whose order matters, such as `@layer` and `@import`. Adjacent rules with the same selector now become one rule. Add the selectors of a later rule to an earlier rule with the identical declaration.


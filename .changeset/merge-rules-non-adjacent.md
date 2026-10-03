---
"postcss-merge-rules": minor
"cssnano-preset-default": minor
---

Merge rules with the same selector even when other rules sit between them, as long as none of those rules sets a conflicting property. Merge sibling `@media`, `@supports` and `@container` blocks with identical conditions in the same way, and remove the emptied block instead of leaving it behind. Rules stay apart across `all`, shorthands that reset their longhands, logical properties that can address the same side, and at-rules whose position matters, such as `@layer` and `@import`. Adjacent rules with the same selector now become one rule instead of a repeated selector list.

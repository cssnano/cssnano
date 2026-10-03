---
"postcss-discard-duplicates": minor
---

Remove a declaration that a later sibling `@media`, `@supports`, `@container` or named `@layer` block with identical conditions repeats, so duplicates are dropped before `postcss-merge-rules` joins the blocks.

Keep an earlier duplicate `@media`, `@supports` or `@container` block that declares an `@layer`, so removing it no longer moves the layer's first appearance and changes the layer order. Also keep a rule that holds a `/*!` comment when its declarations are removed.

Keep a duplicate `@import`, so removing the earlier copy no longer changes the layer order.

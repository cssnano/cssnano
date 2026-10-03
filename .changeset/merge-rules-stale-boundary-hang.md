---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Fix an infinite loop that ran out of memory on valid CSS: when equal `@media` blocks were separated by a non-rule at-rule such as `@layer x;`, `@font-face` or `@page`, a partial merge left a stale block boundary and a rule was merged into itself forever.

Fix a rendering bug when a rule moved into a block nested inside another block: the enclosing block's last rule was recorded wrongly, so a later merge could combine two rules in reverse order and change which declaration wins.

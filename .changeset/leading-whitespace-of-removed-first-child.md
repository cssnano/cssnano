---
"cssnano": patch
---

fix(cssnano): the stylesheet's leading whitespace follows its first child when that child is removed

When a removed rule, comment or charset led the stylesheet, its whitespace could be left out of the output, or the whitespace of a later removed rule could be printed. The output now starts with the whitespace of the child that remains first, as PostCSS prints it. The `advanced` preset no longer leaves leading whitespace when a merge moves the first rule.

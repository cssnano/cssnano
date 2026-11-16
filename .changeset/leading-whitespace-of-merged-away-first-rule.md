---
"cssnano": patch
---

fix(cssnano): the stylesheet's leading whitespace follows its first rule when a merge removes that rule

When the `advanced` preset's rule merging emptied and removed the first rule of a stylesheet, the rule after it printed its own whitespace, and the leading whitespace was lost. The output now starts with the whitespace of the removed rule, as PostCSS prints it.

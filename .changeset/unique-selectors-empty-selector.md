---
"cssnano": patch
---

fix(cssnano): postcss-unique-selectors keeps the empty selector of a list with comments, so the rule stays invalid

A selector list with a comment in an item and an empty item, such as `:is(/*a*/.x,/*b*/.y), :is(.x,.y),`, lost its empty item, which made the rule valid and applied it in browsers that ignore the rule. The empty item is kept. Deduplicated selectors are joined with a bare comma, without the space that followed the comma before.

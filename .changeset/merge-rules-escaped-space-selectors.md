---
"cssnano": patch
---

fix(cssnano): rules whose selectors differ by an escaped space are not merged

A selector ending in an escaped space, such as `a\ `, selects an element whose name ends in a space, which is not the element `a`. Rules with `a\ ,b` and `a\,b` as selectors were joined as if they were one selector, so `a\ ,b{color:red}c{top:0}a\,b{color:blue}` gave `a\ ,b{color:red;color:blue}c{top:0}`, which made the element `a ` blue. Now the first input is left unchanged, and the second gives `@media print{a\ ,b{color:red}a\,b{color:blue}}c{top:0}`, keeping both rules apart.

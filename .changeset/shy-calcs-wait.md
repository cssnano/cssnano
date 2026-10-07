---
"postcss-merge-longhand": patch
---

fix(postcss-merge-longhand): keep separate declarations when one nests a function the targets may not parse, such as `calc(sibling-index() * 1px)`, as a browser that lacks the function would drop the whole shorthand

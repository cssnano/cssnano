---
"cssnano": patch
---

fix(cssnano): a comment or the space before `;` inside a value is no longer removed when its option is disabled and the longhand merge does not change the value. `a{margin:1px/*c*/ 2px}` keeps its comment with `discardComments` disabled, and `a{border-radius:.5em ;}` keeps its space with `normalizeWhitespace` disabled, as `a{color:red/*c*/}` already did

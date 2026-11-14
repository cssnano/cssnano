---
"cssnano": patch
---

fix(cssnano): a backslash that ends the last declaration of a block keeps the character it escapes. A value with a comment keeps its important comments and the space a removed comment stood for, and an escaped space before a semicolon or an `!important` flag is no longer replaced by the whitespace before the closing brace

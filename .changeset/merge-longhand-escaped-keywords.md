---
"cssnano": patch
---

fix(cssnano): read escaped keywords in grid placement and list-style longhands

The longhand merge compared the raw spelling of an identifier, so an escaped keyword such as `\61uto`, `\73pan` or `\69nherit` in `grid-row-start` passed as a custom identifier, and `\6futside` or `\69nherit` in `list-style-type` passed as a counter style name. Merging those into a shorthand changed what the browser reads. The identifiers are now compared unescaped, and such longhands stay as written.

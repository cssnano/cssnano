---
"cssnano": patch
---

fix(cssnano): whitespace normalization keeps the space that an escape takes at the end of a selector, an at-rule prelude or a value

`a\ {…}`, `@media a\ {…}`, `@keyframes fade\ {…}`, `@layer a\ ;` and `fade\ !important` were minified to text where the backslash escaped the `{`, the `;` or the `!`, which changed or broke the stylesheet.

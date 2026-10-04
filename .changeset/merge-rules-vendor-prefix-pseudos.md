---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Read the vendor prefix of a selector only from its pseudo-class and pseudo-element names. A class name or attribute value such as `.x-moz-y` or `[title=":-moz-x"]` no longer blocks merging with a `::-moz-selection` rule, and a selector that mixes two vendor prefixes is never merged. Pseudo names are case-insensitive, so `::-WEBKIT-scrollbar` now counts as WebKit-prefixed and stays apart from unprefixed rules.

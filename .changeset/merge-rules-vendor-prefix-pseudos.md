---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Determine the vendor prefix of a selector only from its pseudo-class and pseudo-element names. A class name or attribute value such as `.x-moz-y` or `[title=":-moz-x"]` no longer blocks merging with a `::-moz-selection` rule, and a selector that mixes two vendor prefixes is never merged. Compare pseudo-element names case-insensitively, so `::-WEBKIT-scrollbar` now counts as WebKit-prefixed and stays apart from unprefixed rules.

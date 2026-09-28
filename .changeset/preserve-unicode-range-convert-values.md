---
"cssnano-utils": patch
"postcss-convert-values": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Preserves Unicode range tokens (`unicode-range`) in font descriptors and custom properties during value conversion, preventing code point ranges from being corrupted into invalid numbers or dimensions.

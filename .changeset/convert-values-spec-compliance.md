---
"postcss-convert-values": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Preserves zero length in `columns` shorthands and zero units inside `@property` with `<angle-percentage>` syntax, retaining keyframe percentage units under nested rules. Symmetrically rounds negative numbers when precision is configured, converts between metric units (`mm`, `cm`, `q`), preserves zero percentages on SVG stroke properties to retain transition interpolation, and caches Browserslist lookups across runs. Also preserves units inside CSS Fonts 5 override descriptors, `anchor()` functions, `flex-basis`, and IE-targeted sizing properties.

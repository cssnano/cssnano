---
"postcss-merge-longhand": minor
"cssnano-preset-default": minor
"cssnano": minor
---

Merge box alignment properties into the `place-content`, `place-items` and `place-self` shorthands, such as `align-items:center;justify-items:start` into `place-items:center start`. This only happens when every browser in your Browserslist targets supports the shorthands, because a browser that does not would ignore both alignments. The `defaults` query includes browsers with unknown support, such as Opera Mini and UC Browser, so it keeps the longhands. Values that use `safe`, `unsafe` or `last baseline` merge only when both values use the same keywords. `postcss-merge-longhand` now accepts the Browserslist options `overrideBrowserslist`, `stats`, `path` and `env`.

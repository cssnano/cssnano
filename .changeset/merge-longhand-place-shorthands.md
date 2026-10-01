---
"postcss-merge-longhand": minor
"cssnano-preset-default": minor
"cssnano": minor
---

Merge box alignment longhands such as `align-items` and `justify-items` into the `place-*` shorthands when every Browserslist target supports `place-content`, `place-items` and `place-self`. Browsers without them would ignore the shorthand and lose both axes, so targets without compatibility data, including Opera Mini in the `defaults` query, keep the longhands. `postcss-merge-longhand` now accepts the Browserslist options `overrideBrowserslist`, `stats`, `path` and `env`, which `cssnano-preset-default` passes through. Longhands that use a keyword some target may not parse, such as `safe`, `unsafe`, `last baseline` or `safe normal`, merge only with a value that needs the same keywords.

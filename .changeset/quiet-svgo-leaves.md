---
"cssnano-preset-default": minor
"cssnano-preset-advanced": minor
"cssnano": minor
---

feat(cssnano-preset-default): remove postcss-svgo from the preset

The presets no longer run `postcss-svgo`; run it before cssnano or optimize SVG assets with svgo instead. A `svgo` option is now ignored. The output changes for CSS with inline SVG data URIs, and for CSS with URLs that `postcss-normalize-url` used to rewrite (see the `postcss-normalize-url` changeset).

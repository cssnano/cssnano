---
"cssnano": major
---

refactor(cssnano)!: the built-in presets run their value transforms in host plugins

The default and advanced presets no longer return one PostCSS plugin per value transform. Each run of adjacent value transforms (gradients, initial values, display values, transforms, colors, timing functions, `calc()` and units) is one host plugin that walks the declarations once. A preset's array therefore has fewer entries, and a host plugin is not the same object as the plugin it replaces. Option keys, their meaning and the CSS output are unchanged.

Code that inspects a preset's plugins by `postcssPlugin` name, or that expects `postcss-calc` or `postcss-convert-values` to be its own entry, needs to read the `cssnano-host` entry instead.

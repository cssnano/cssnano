---
"cssnano": minor
---

cssnano now ships its presets and plugins, so `preset: 'lite'` and `preset: 'advanced'` work without installing another package. Installed presets still take precedence over the built-in ones, and the full names such as `cssnano-preset-default` fall back to the built-in preset when no package is installed. Output is unchanged. Projects that require `cssnano-preset-default` directly must declare it as a dependency, or switch to `preset: ['default', {...}]`. `overrides` and `resolutions` that pin an individual plugin no longer apply.

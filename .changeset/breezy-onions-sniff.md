---
"cssnano": minor
---

cssnano now ships its presets and plugins in a single package, so installing it adds one cssnano package to your dependency tree instead of about thirty, and you have fewer packages to review in audits and lockfile updates. Releases are now staged: a maintainer must approve each one on npm with two-factor authentication before it is available, so a leaked automation token cannot publish a version on its own. Output is unchanged.

`preset: 'lite'` and `preset: 'advanced'` now work without installing another package. An installed preset package still takes precedence over the built-in one and prints a one-time `CSSNANO_INSTALLED_PRESET` warning; pass the imported preset function to keep it without the warning. Full names such as `cssnano-preset-default` fall back to the built-in preset when no package is installed. Projects that require `cssnano-preset-default` directly must declare it as a dependency, or switch to `preset: ['default', {...}]`. `overrides` and `resolutions` that pin an individual plugin no longer apply.

---
"cssnano": major
---

feat(cssnano)!: cssnano no longer reads `env` and `stats` from the PostCSS process options

When no preset sets them, the browser targets took `env` and `stats` from the options of the PostCSS `process()` call. They are now read only from `browserslist.env` and `browserslist.stats`, so the targets of a build are set in one place, the cssnano config. Pass them as `browserslist: { env, stats }` in the preset options.

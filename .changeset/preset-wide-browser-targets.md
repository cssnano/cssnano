---
"cssnano": major
---

feat(cssnano)!: drop per-plugin browser target options

Browser targets are set once for every plugin, with `browserslist: { query, env, stats }`. The plugins are no longer published separately, so every plugin judges a file against the same browsers. `overrideBrowserslist`, `stats`, `env` and `path` given to one plugin, such as `options: { colormin: { overrideBrowserslist: 'ie 11' } }`, throw, because ignoring them would widen the targets.

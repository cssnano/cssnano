---
"cssnano": major
---

feat(cssnano)!: drop per-plugin browser target options

Browser targets are now preset options only. `overrideBrowserslist`, `stats`, `env` and `path` given to a single plugin, such as `colormin: { overrideBrowserslist: 'ie 11' }`, are ignored with a PostCSS warning and no longer part of the plugin option types; set them at the top level of the preset options instead. The plugins are no longer published separately, so every plugin judges a file against the same browsers.

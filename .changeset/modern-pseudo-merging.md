---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
---

Merge rules that use modern pseudo-classes and pseudo-elements — `:modal`, `::file-selector-button`, `:read-only`, `:read-write`, `:autofill`, and `:fullscreen` — when every browser in the target list supports the corresponding feature. Support is still checked per browser, so these selectors remain unmerged under older targets, and pseudos without verified support data such as `:popover-open` and `:user-invalid` continue to block merging.

---
"postcss-reduce-idents": patch
---

fix(postcss-reduce-idents): rename grid-template-areas names without corrupting row order

`grid-area`/`grid-column`/`grid-row` names are now only renamed in `grid-template-areas`, `grid-template-columns`, `grid-template-rows`, and `grid-template` when a matching declaration references them. Previously, renaming could collide (e.g. two names swapping identifiers) and produce a non-rectangular `grid-template-areas` layout, which is invalid per the CSS Grid spec.

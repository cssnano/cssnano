---
"cssnano": patch
---

fix(cssnano): postcss-calc's `mediaQueries` option leaves a container `style()` query unchanged

A `calc()` inside `@container style()` was reduced, although a style query matches the custom property as written. The other conditions of the container query are still reduced.

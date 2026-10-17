---
"cssnano": major
---

feat(cssnano)!: drop browser workarounds for targets older than IE 11

Workarounds for IE 5.5 to 10, Firefox 2 and Opera 9 are removed, so output is written for IE 11 and newer. IE 11 keeps the zero-unit, `media all` and `unicode-range` workarounds, and `@media \0screen` is kept for every target.

`initial` is no longer rewritten for targets without the initial keyword, such as IE 11, which ignores a declaration that uses it. `min-width:initial` stays as written for `ie 11`.

`rgba(0,0,0,0)` becomes `transparent` for every known target. A query that matches no browser keeps `rgba()`.

Stylehacks is no longer a PostCSS plugin and is not part of the public package. postcss-merge-longhand still uses its detection functions, so it never merges hacked declarations.

A browser version that caniuse-lite does not list adds a PostCSS warning.

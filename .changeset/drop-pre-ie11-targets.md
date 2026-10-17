---
"cssnano": major
---

feat(cssnano)!: drop browser workarounds for targets older than IE 11

Browser bug workarounds for Internet Explorer 5.5 to 10, Firefox 2 and Opera 9 are removed. A target list that includes one of them no longer changes the output for that bug, so the output is written for IE 11 and newer. IE 11 keeps the workarounds for the zero-unit, `media all` and `unicode-range` bugs, and the `@media \0screen` hack is kept for every target.

`initial` is no longer rewritten to a fallback value for a target that lacks the initial keyword, such as IE 11. IE 11 ignores a declaration that uses `initial`, so rewriting it would make the declaration apply. For example, `min-width:initial` stays as written for `ie 11`, where it was previously written as `min-width:auto`.

`rgba(0,0,0,0)` becomes the `transparent` keyword for every known target, because the IE 8 and 9 click bug no longer applies. A query that matches no browser keeps `rgba()`.

Stylehacks is no longer a PostCSS plugin and is not part of the public package. Its detection functions stay internal, and postcss-merge-longhand still uses them so it never merges hacked declarations into a shorthand.

A browser version that cssnano's copy of caniuse-lite does not list adds a PostCSS warning.

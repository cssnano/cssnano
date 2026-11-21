---
"cssnano": patch
---

fix(cssnano): keep keyframes and font faces that a substitution function may name

`discardUnused` removed a `@keyframes` or `@font-face` whose name reached its use only through `var()`, `env()`, `attr()` or a custom function, such as `:root{--a:foo}a{animation:var(--a) 1s}`. A value holding one of these may name any keyframes or family, so they all stay now. A `@font-face` without a `font-family` is still removed.

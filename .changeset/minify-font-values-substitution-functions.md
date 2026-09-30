---
"postcss-minify-font-values": patch
---

Leave `font` shorthands that contain `attr()`, `if()`, `inherit()` or a custom function such as `--name()` unchanged, as already done for `var()` and `env()`, since their values are substituted at computed-value time.

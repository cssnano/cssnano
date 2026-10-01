---
"postcss-minify-gradients": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Only shorten zero colour stop positions that are valid for the gradient. Conic gradients now shorten zero angles such as `0deg` and no longer rewrite invalid zero lengths such as `0px`, while linear and radial gradients keep rewriting zero lengths. Prefixed `-webkit-` linear gradients keep `to <side>` as written, since the legacy syntax would read the replacement angle differently.

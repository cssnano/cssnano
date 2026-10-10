---
"cssnano-utils": major
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
"cssnano-preset-lite": patch
"postcss-colormin": patch
"postcss-convert-values": patch
"postcss-discard-comments": patch
"postcss-discard-duplicates": patch
"postcss-discard-empty": patch
"postcss-discard-unused": patch
"postcss-merge-idents": patch
"postcss-merge-longhand": patch
"postcss-merge-rules": patch
"postcss-minify-font-values": patch
"postcss-minify-gradients": patch
"postcss-minify-params": patch
"postcss-minify-selectors": patch
"postcss-normalize-display-values": patch
"postcss-normalize-positions": patch
"postcss-normalize-repeat-style": patch
"postcss-normalize-string": patch
"postcss-normalize-timing-functions": patch
"postcss-normalize-unicode": patch
"postcss-normalize-url": patch
"postcss-normalize-whitespace": patch
"postcss-ordered-values": patch
"postcss-reduce-idents": patch
"postcss-reduce-transforms": patch
"postcss-svgo": patch
---

feat!: remove the unused `sameParent` export, and `sameContainer`, `numericSource` and `mathFunctionArgumentRanges` from `cssnano-utils`. `mathFunctions` is now a `Map` from each math function name to the inclusive range of its argument count.

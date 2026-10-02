---
"postcss-minify-selectors": patch
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Stop turning a comment inside a selector into a descendant combinator. A comment is not whitespace, so `.a/**/.b` selects elements with both classes, including inside `:is()`, and is no longer rewritten as `.a .b`. Invalid selectors such as `div/**/span` are left as written instead of becoming valid.

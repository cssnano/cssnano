---
"postcss-minify-selectors": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Treat a comment between two selector parts as part of the same compound selector instead of a descendant combinator. Only whitespace separates descendants, so valid selectors like `.a/*!k*/.b` keep their meaning, and invalid ones like `div/**/span` are left as written instead of becoming valid.

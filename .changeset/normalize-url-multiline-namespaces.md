---
'postcss-normalize-url': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Join every escaped line continuation in a multiline `url()` value into one line, including `\r\n` continuations that previously survived and left an invalid string behind. Rewriting a `@namespace` URL no longer overwrites the tokens that follow it, so trailing text is preserved and multiple URLs in one namespace declaration are each normalized.
---
'postcss-discard-comments': patch
'cssnano-preset-default': patch
'cssnano-preset-lite': patch
'cssnano': patch
---

Remove comments more reliably and preserve the ones you keep exactly. Comments are now removed from declaration values that carry `!important`, and comment detection respects CSS token boundaries: text inside unquoted `url()` values and behind escape sequences in strings and identifiers is no longer mistaken for a comment. Kept comments are emitted byte-for-byte, including an unclosed comment at the end of a value, and whitespace inside kept comments is left untouched. Removal state is scoped to each document, so a shared processor no longer carries `removeAllButFirst` first-comment state between runs, and the `remove` callback runs once per comment occurrence. A non-function `remove` option now fails with a `TypeError`.

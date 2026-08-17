---
"postcss-normalize-whitespace": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
"cssnano-preset-lite": patch
---

fix(postcss-normalize-whitespace): stop dropping the escaped character in a trailing backslash escape

A declaration ending in a backslash escape of a whitespace character (the `\9` IE hack transformed by tools like esbuild into a literal `\` followed by a tab) lost that character when it was also the last declaration in its rule, leaving a dangling backslash and invalid CSS. The escaped character is now kept, while any further redundant whitespace after it is still trimmed as usual.

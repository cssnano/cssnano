---
"postcss-normalize-string": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Keep strings unchanged when removing a line continuation (a backslash before a newline) right after an escape. In `"\31` followed by a line continuation and `2"`, joining the lines would turn `\31` into `\312`, so the result is now `"\31 2"`.

Leave `@charset` unchanged. Browsers only recognize it with double quotes, so rewriting single quotes would make an ignored `@charset` take effect.

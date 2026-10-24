---
"cssnano": patch
---

fix(cssnano): keep the whitespace around `\9` inside a string

The IE hack's `\9` was matched in the whole value, so `content:"a \9 b"` became `content:"a\9b"`, which changes the string. Only the text outside strings is now trimmed around `\9`.

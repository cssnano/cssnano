---
"postcss-normalize-string": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Keep string values unchanged when removing a line continuation (a backslash before a newline) right after a hex escape. When a string contains `\31`, then a backslash and a newline, then `2`, joining the lines would let the escape absorb the `2`, so the plugin now writes `"\31 2"`. A space is added only when the next character is a hex digit or whitespace and the escape has no whitespace terminator of its own; any CSS whitespace, including a newline, CRLF or form feed, counts as a terminator.

Leave `@charset` rules untouched, because browsers only recognize them with double quotes.

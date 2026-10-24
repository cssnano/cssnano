---
"cssnano": patch
---

fix(cssnano): escape a font family name that is a lone hyphen

`font-family: "-"` became `font-family: -`. A bare hyphen tokenizes as a delim, so the family list was invalid and browsers ignored the declaration. It is now `\-`. The preset snapshot is unchanged.

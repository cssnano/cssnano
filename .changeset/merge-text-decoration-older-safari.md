---
"cssnano": patch
---

fix(cssnano): keep the text-decoration longhands for Safari before 26.2

Safari before 26.2 reads the `text-decoration` shorthand as the line alone and does not reset the style, color or thickness. The longhand merge wrote the shorthand for such targets whenever those three were at their initial values, which left an earlier style, color or thickness in effect. The longhands now stay unless every target supports the full shorthand.

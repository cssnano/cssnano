---
"cssnano": patch
---

fix(cssnano): convert-values keeps a unit that it would drop when the next token touches the number

`0px.5px`, `0%top`, `100%%`, `50%%` and `50%e3` were shortened to `0.5px`, `0top`, `1%`, `.5%` and `.5e3`. The unitless number joined the token after it, so valid CSS changed meaning and invalid CSS became valid. Such values now stay as written.

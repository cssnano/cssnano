---
"cssnano": patch
---

fix(cssnano): `cjk-ideographic` is a predefined counter style, so reduce-idents no longer renames a style with that name and discard-unused keeps the override; a counter style name folds ASCII case only, so a name spelled with a Kelvin sign is not `khmer`

---
'postcss-reduce-transforms': patch
'cssnano-preset-default': patch
---

Only reduce transform functions whose component types match the spec; keep invalid values unchanged. Never merge a `var()` reference with an `env()` reference of the same name.

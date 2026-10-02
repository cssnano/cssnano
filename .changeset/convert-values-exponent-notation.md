---
"postcss-convert-values": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Write numbers in scientific notation when it is shorter, such as `1e-6px` for `0.000001px` and `1e6px` for `1000000px`. This also applies when `length` unit conversion is disabled. Numbers written without a decimal point, such as `z-index:1000000`, keep their form, because an `<integer>` cannot use scientific notation.

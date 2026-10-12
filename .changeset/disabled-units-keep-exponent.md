---
"postcss-convert-values": patch
---

Disabling the `time`, `angle` or `frequency` option no longer turns off exponent formatting, so `1e-6s` stays short instead of becoming `.000001s`. This matches the existing behavior for `length: false`.

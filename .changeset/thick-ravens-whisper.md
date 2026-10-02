---
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Update `postcss-calc` to 11.2.2. Multiplications inside `calc()` now keep their original operand order, so `calc(var(--x) * 5)` is no longer rewritten as `calc(5 * var(--x))`.

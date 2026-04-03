---
'cssnano-preset-advanced': major
'cssnano-preset-default': major
'cssnano': major
---

Removed `cssDeclarationSorter` from the `default` preset. It remains enabled in
the `advanced` preset.

## Motivation
The plugin can cause breakages without notice whenever a new CSS longhand
property is released to browsers if it happens to cause a conflict with another
longhand property. To ensure safety and predictability, it is no longer enabled
by default.

## How to Update
If you rely on declaration sorting, you can switch to the `advanced` preset or
explicitly enable `cssDeclarationSorter` in your configuration.

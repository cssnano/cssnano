---
'postcss-merge-longhand': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Merge margin, padding, border, border-radius, columns, and border-spacing declarations inside at-rule containers such as `@page`, `@position-try`, and nested at-rules. Fold identical horizontal and vertical `border-spacing` components to a single value. Recognize `columns` shorthands combining a count and a math function in either order, and preserve invalid declarations as written: border shorthands with multiple styles and `columns` values combining CSS-wide keywords with widths or counts no longer discard preceding valid longhands.

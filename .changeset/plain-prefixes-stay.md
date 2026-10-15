---
"cssnano-preset-advanced": major
---

feat(cssnano-preset-advanced): remove autoprefixer and css-declaration-sorter

The advanced preset no longer removes vendor prefixes or sorts declarations, and no longer depends on `autoprefixer` or `css-declaration-sorter`. To keep removing outdated prefixes, install the `autoprefixer` npnm package and run the `autoprefixer` PostCSS plugin with `add: false` before cssnano. To keep sorting declaration, install the `css-declaration-sorter` npm package and run the `css-declaration-sorter` PostCSS plugin with `keepOverrides: true`. The `autoprefixer` and `cssDeclarationSorter` cssnano advanced preset options are gone; passing them has no effect.

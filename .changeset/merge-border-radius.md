---
'postcss-merge-longhand': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Merge corner `border-*-radius` longhands into `border-radius` shorthands. Four complete corner declarations in the same importance lane now collapse into one shorthand, with horizontal and vertical axes minified independently and separated by a slash when distinct. Declarations in the radius family are decoupled from physical border fast-path eligibility, allowing rules containing both physical borders and border radii to optimize both families.

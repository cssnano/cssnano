---
"postcss-merge-longhand": minor
"cssnano-preset-default": minor
"cssnano-preset-advanced": minor
"cssnano": minor
---

feat(postcss-merge-longhand): merge flow-relative and physical box properties safely

The plugin now merges and shortens `margin-block`, `margin-inline`, their `padding`, `inset`, `scroll-margin` and `scroll-padding` counterparts, and the physical `inset`, `scroll-margin` and `scroll-padding` longhands. It never assumes a writing mode or direction, so a flow-relative declaration moves only where no physical declaration of the same group can set the same side, and the reverse. It creates a shorthand only when every browserslist target supports it. It also drops declarations that later ones override on every side in every writing mode, and repeats a neighbour's value in the overridden slots of a shorthand so that it condenses.

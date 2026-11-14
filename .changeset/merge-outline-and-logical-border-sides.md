---
"cssnano": minor
---

feat(cssnano): merge the `outline-width`, `outline-style` and `outline-color` longhands into `outline`, and the three longhands of each logical border side into `border-block-start`, `border-block-end`, `border-inline-start` and `border-inline-end`. A logical side is merged only for targets that parse it, and not beside a physical border property, an axis shorthand, a legacy `-webkit-border-before` style spelling or `all`, which can set the same side in some writing modes. `outline` keeps its color, because the initial `outline-color` differs between specifications, and merges `outline-style: auto` only when every target parses it, because an engine without it would drop the whole shorthand.

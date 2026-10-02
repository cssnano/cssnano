---
"postcss-merge-longhand": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Stop merging longhands across a nested rule or at-rule. The shorthand ended up after the nested rule and overrode it, so in `a{margin-top:1px;&{margin-top:2px}…}` the nested `margin-top` was lost. This applies to `margin`, `padding`, `border`, `border-radius` and `columns`. Declarations on each side of a nested rule are now merged separately. An at-rule without a block, such as `@apply x;`, also separates them, since it may add declarations. An empty rule such as `&{}` does not. A `border-image` or `all` declaration before a nested rule no longer prevents merging the `border` longhands after it.

---
"postcss-merge-longhand": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Stop merging longhands across a nested rule. In `a{margin-top:1px;&{margin-top:2px}margin-right:1px;margin-bottom:1px;margin-left:1px}` the merged `margin` landed after the nested rule and overrode its `margin-top`. The same applied to `padding`, `border`, `border-radius` and `columns` longhands, and to nested at-rules such as `@media`.

Each run of declarations between nested rules is now reduced on its own. A border property the plugin does not merge, such as `border-image`, or an `all` declaration, no longer prevents merging `border` longhands that follow a nested rule. The merged declarations set only the longhands the originals set.

An at-rule without a body, such as `@apply x;`, now also ends a run of declarations, because it expands in place to declarations that may set any longhand.

An empty nested style rule such as `&{}` no longer prevents merging the declarations around it.

---
"postcss-merge-longhand": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-merge-longhand): improve declaration merging correctness

- No longer throw on rules like `border-left: 1px solid; border-width: 1px`.
- Reject merges that would introduce invalid `border`, `margin` or `padding` values, `revert`/`inherit`, or a lost `column-width` reset.
- Leave declarations alone when they're meant to reach different browsers, such as a fallback ahead of an `env()`-based rule.
- Stop values a browser would drop, like an unrecognised colour or a fifth `margin` length, from overriding an earlier declaration or counting as mergeable.
- Keep each side's own stated value when longhands do fold into a shorthand, and no longer resurrects declarations already overridden elsewhere in the rule.
- Handle fallback declarations ahead of a `calc()`/`min()`/`max()`/`clamp()` value, and `!important` weighting, correctly.

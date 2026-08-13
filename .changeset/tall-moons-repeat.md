---
"postcss-reduce-idents": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

fix(postcss-reduce-idents): rewrite identifiers based on spec data

Which declarations define and reference a custom identifier now comes from `@webref/css` instead of matching property names against a substring. The plugin no longer leaves a renamed identifier dangling behind:

- a `@counter-style` renamed while another rule's `fallback` descriptor, or a `counter()`/`counters()`/`target-counter()` argument, still names it by its old name
- a gridline or grid area named by the `grid` shorthand, which was never rewritten even though the `grid-area` placing against it was
- a gridline named inside `repeat()` or `minmax()`
- a counter the experimental `string-set` property

It also no longer renames a keyframes name in properties that cannot hold one, such as `animation-timing-function`, and only renames the argument of a counter function that names a counter, rather than every word inside it.

Names that read as a keyword of the property or descriptor they are written in, such as an animation called `linear`, a counter style called `inside`, or the `words` of `speak-as: words`, are now left alone: which of the two a value means depends on the order the grammar is matched in, so renaming it could change what the declaration does.

The counters the user agent maintains itself, `list-item` and `page`, are no longer renamed either.

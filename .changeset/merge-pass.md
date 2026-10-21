---
"cssnano": major
---

feat(cssnano): run the merge transforms as one `cssnano-merge` plugin

mergeLonghand, discardDuplicates and mergeRules now run in one PostCSS plugin, `cssnano-merge`, instead of three plugins that each walk the stylesheet. The merge transforms are otherwise unchanged, apart from the fixes listed in their own entries: property names are compared by ASCII case and decoded spelling, a statement at-rule is kept apart from a block at-rule, `offset-*` properties are compared with the `inset-*` properties they alias, a hacked declaration (`_height`, `*zoom`) is kept apart from its plain property, and a stale longhand fallback is dropped once a later shorthand overrides it. Code that filters `result.messages` or `plugins` by the old plugin names must use `cssnano-merge`.

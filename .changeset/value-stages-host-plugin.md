---
"cssnano": major
---

refactor(cssnano)!: a built-in preset returns one `cssnano-host` plugin

The default and lite presets no longer return one PostCSS plugin per option. Each returns one `cssnano-host` plugin that walks the stylesheet to run the value transforms, comment removal, whitespace cleanup, empty-node removal and merging. The advanced preset returns that host plugin, which also runs `discardUnused`, `mergeIdents` and `reduceIdents`, followed by `zindex`, which still runs as a plugin of its own. A preset's array therefore has fewer entries, and a host plugin is not the same object as the plugin it replaces. Option keys and their meaning are unchanged.

Code that inspects a preset's plugins by `postcssPlugin` name, or that expects `postcss-calc`, `postcss-convert-values`, `postcss-discard-empty` or `postcss-discard-unused` to be its own entry, needs to read the `cssnano-host` entry instead.

Output changes in this release:

- An existing `@charset` is dropped when its only non-ASCII text was in a rule that discardEmpty removes. The `@charset` decision now runs after that removal.
- With the advanced preset, a container that held only at-rules discardUnused removes, such as `@media print{@keyframes a{…}}` with `a` unused, is removed too, unless discardEmpty is disabled. An emptied named `@layer` stays, since it may fix the layer order.
- With the advanced preset, an existing `@charset` is dropped when its only non-ASCII text was in an at-rule that discardUnused removes.
- With the advanced preset, a container that held only a repeat definition mergeIdents removes is removed too, unless discardEmpty is disabled, such as an unnamed `@layer` that held `@keyframes a{…}` when another `@keyframes a{…}` survives. An emptied named `@layer` stays.
- With the advanced preset, an existing `@charset` is dropped when its only non-ASCII text was a name that mergeIdents removes or reduceIdents renames.

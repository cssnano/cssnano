---
title: "Options"
layout: BasicPage
---

## Transforms

See the [optimisations](/optimisations/) section.

## options.browsers (array|string)

Set a browser scope which will be used by cssnano to determine which
optimisations are safe to perform, using [browserslist]. You can use this option
to set browser requirements for all optimisations at once.

If you don't set this option, then [browserslist] will try to find one from
a config file, entry in `package.json`, environment variables or will load
its defaults if it can't find anything.

*Note that this is a new feature since version `3.10.0` and so support for it is
limited to `autoprefixer` right now. Better support for this option is planned
for version `4.0.0`.*

[browserslist]: https://github.com/ai/browserslist#readme

## options.safe (bool)

Set this to `true` to disable advanced optimisations that are not always safe.
Currently, this disables custom identifier reduction, `z-index` rebasing,
unused at-rule removal & conversion between absolute length values.

```sh
cssnano --safe in.css out.css
```

## options.sourcemap (bool)

Set this to `true` to generate an inline source map.

```sh
cssnano --sourcemap in.css out.css
```

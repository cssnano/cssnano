---
title: "Options"
layout: BasicPage
---

## Transforms

See the [optimisations](/optimisations/) section.

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

---
id: Introduction
title: Introduction
layout: layouts/MainLayout.njk
next: getting-started
---

## What is minification?

Minification is the process of taking some code and using various methods to
reduce its size on disk. Unlike techniques such as gzip, which preserve the
original semantics of the CSS file, and are therefore lossless, minification
is an inherently lossy process, where values can be replaced with smaller
equivalents, or selectors merged together, for example.

The end result of a minification step is that the resulting code will behave
the same as the original file, but some parts will be altered to reduce the
size as much as possible.
Combining gzip compression with minification leads to the best reduction in
file size.


## What is cssnano?

cssnano is one such minifier, which is written in [Node.js]. It's a [PostCSS]
plugin which you can add to your build process, to ensure that the resulting
stylesheet is as small as possible for a production environment.

If you don't know what a build process is, don't worry as we cover this in
[our getting started guide](/docs/getting-started).


## How does it benefit me?

### Numerous optimisations

We offer many different optimisations, ranging from simple transforms such as
whitespace removal, to complex transforms that can merge identical keyframes
with different names. See [the presets guide](/docs/presets) for
more information.

### Unified CSS processing

cssnano uses [PostCSS] to process the CSS under the hood. Because a lot of
modern CSS tools use [PostCSS], you can compose them together to work on a
single abstract syntax tree (AST). This means that the overall processing
time is reduced because the CSS does not have to be parsed multiple times.

### Modern architecture & modularity

Because we use [PostCSS], we can divide cssnano's responsibilities between many
plugins, each performing a small optimisation. And many optimisations are scoped
to a certain subset of CSS properties, which is much safer compared to minifying
CSS globally using regular expressions.

[node.js]: https://nodejs.org

[postcss]: http://postcss.org


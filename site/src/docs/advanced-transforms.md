---
id: advanced-transforms
title: Advanced transforms
description: Advanced transforms make assumptions about your CSS. Check them before you enable one.
---

## What are advanced transforms?

Certain optimizations are not suitable for all use cases; unlike those that
we bundle by default, advanced transforms all carry a certain amount of risk.
For each type of transform, we've documented the assumptions that it must make
about your CSS (Cascading Style Sheets) in order for the transform to be safe. Most of these transforms
fall into either or both of categories.

### Assumes concatenation

This transform assumes that the CSS passed through cssnano is all that is needed
for a website to run; it doesn't import resources from any other source. This
_may_ be problematic if the styles you are writing in some way interact with
third party styles, or you are using multiple stylesheets instead of
concatenating them, or you are injecting CSS via JavaScript, for example.

A good example is [postcss-merge-idents]; in order for this transform to be safe
any `@keyframes` rules and selectors that utilise them must be in the same file.

[postcss-merge-idents]: https://github.com/cssnano/cssnano/tree/master/packages/postcss-merge-idents

### Changes semantics

This transform changes CSS semantically; it may remove styles based on certain
characteristics of the CSS, or it might update values to make the CSS smaller
overall. Depending on exactly what the transform does, this _may_ be undesirable
because it might change the appearance of your website in certain use cases.

A good example is [postcss-zindex]; this transform changes CSS semantics by
rewriting `z-index` values to smaller integers that keep their relative
order. In order for this transform to be safe, no other stylesheet or script
may set `z-index` values that must stack against the rewritten ones.

[postcss-zindex]: https://github.com/cssnano/cssnano/tree/master/packages/postcss-zindex


## Using advanced transforms

Advanced transforms are not applied by default. The `advanced` preset is built
into cssnano, so you can load it using any of the techniques mentioned in
[our presets guide](../presets/). For example, using `cssnano.config.js`:

```js
// cssnano.config.js
module.exports = {
  preset: 'advanced',
};
```


## Do you have an idea for an advanced transform?

Did we miss an opportunity to compress your CSS further? You can learn about
[how to contribute](../contributing/) in our next guide.

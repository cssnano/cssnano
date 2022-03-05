---
id: advanced-transforms
title: Advanced transforms
layout: layouts/MainLayout.njk
order: 5
---

## What are advanced transforms?

Certain optimizations are not suitable for all use cases; unlike those that
we bundle by default, advanced transforms all carry a certain amount of risk.
For each type of transform, we've documented the assumptions that it must make
about your CSS in order for the transform to be safe. Most of these transforms
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

A good example is [autoprefixer]; this transform changes CSS semantics by
removing out of date vendor prefixes. In order for this transform to be safe,
your [browserslist] configuration must reflect the browsers that your site
chooses to support.

[autoprefixer]: https://github.com/postcss/autoprefixer

[browserslist]: https://github.com/ai/browserslist


## Using advanced transforms

Advanced transforms are not bundled with cssnano by default, so you'll need
to install the preset alongside cssnano:

```shell
npm install cssnano-preset-advanced --save-dev
```

You can then load it using any of the techniques mentioned in
[our presets guide](/docs/presets). For example, using `package.json`:

```json
{
  "name": "awesome-application",
  "cssnano": {
    "preset": "advanced"
  }
}
```


## Do you have an idea for an advanced transform?

Did we miss an opportunity to compress your CSS further? You can learn about
[how to contribute](/docs/contributing) in our next guide.

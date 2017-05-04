---
title: Optimisations
layout: Guide
order: 3
---


## What are optimisations?

An optimisation is a module that performs a transform on some CSS code in order
to reduce its size, or failing this, the final gzip size of the CSS. Each
optimisation is performed by either one module or a few modules working
together.

Due to the nature of dividing cssnano's responsibilities across several modules,
there will be some cases where using a transform standalone will not produce
the most optimal output. For example, postcss-colormin will not trim whitespace
inside color functions as this is handled by postcss-normalize-whitespace.


## What optimisations do you support?

The optimisations are different depending on which preset cssnano is configured with; with the default preset, we offer safe transforms only.

|                                    | default | advanced |
| ---------------------------------- | ------- | -------- |
| autoprefixer                       | ❌       | ✅        |
| cssnano-style-cache                | ✅       | ✅        |
| postcss-calc                       | ✅       | ✅        |
| postcss-colormin                   | ✅       | ✅        |
| postcss-convert-values             | ✅       | ✅        |
| postcss-discard-comments           | ✅       | ✅        |
| postcss-discard-duplicates         | ✅       | ✅        |
| postcss-discard-empty              | ✅       | ✅        |
| postcss-discard-overridden         | ✅       | ✅        |
| postcss-discard-unused             | ❌       | ✅        |
| postcss-merge-idents               | ❌       | ✅        |
| postcss-merge-longhand             | ✅       | ✅        |
| postcss-merge-rules                | ✅       | ✅        |
| postcss-minify-font-values         | ✅       | ✅        |
| postcss-minify-gradients           | ✅       | ✅        |
| postcss-minify-params              | ✅       | ✅        |
| postcss-minify-selectors           | ✅       | ✅        |
| postcss-normalize-charset          | ✅       | ✅        |
| postcss-normalize-display-values   | ✅       | ✅        |
| postcss-normalize-positions        | ✅       | ✅        |
| postcss-normalize-repeat-style     | ✅       | ✅        |
| postcss-normalize-string           | ✅       | ✅        |
| postcss-normalize-timing-functions | ✅       | ✅        |
| postcss-normalize-unicode          | ✅       | ✅        |
| postcss-normalize-url              | ✅       | ✅        |
| postcss-normalize-whitespace       | ✅       | ✅        |
| postcss-ordered-values             | ✅       | ✅        |
| postcss-reduce-idents              | ❌       | ✅        |
| postcss-reduce-initial             | ✅       | ✅        |
| postcss-reduce-transforms          | ✅       | ✅        |
| postcss-svgo                       | ✅       | ✅        |
| postcss-unique-selectors           | ✅       | ✅        |
| postcss-zindex                     | ❌       | ✅        |

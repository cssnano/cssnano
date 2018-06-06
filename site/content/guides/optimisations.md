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

<!-- This section is automatically generated. -->

The optimisations are different depending on which preset cssnano is configured with; with the default preset, we offer safe transforms only.

|  | default | advanced |
| --- | ------- | -------- |
| [autoprefixer](/optimisations/autoprefixer) | ❌ | ✅ |
| [css-declaration-sorter](/optimisations/cssdeclarationsorter) | ✅ | ✅ |
| [cssnano-util-raw-cache](/optimisations/rawcache) | ✅ | ✅ |
| [postcss-calc](/optimisations/calc) | ✅ | ✅ |
| [postcss-colormin](/optimisations/colormin) | ✅ | ✅ |
| [postcss-convert-values](/optimisations/convertvalues) | ✅ | ✅ |
| [postcss-discard-comments](/optimisations/discardcomments) | ✅ | ✅ |
| [postcss-discard-duplicates](/optimisations/discardduplicates) | ✅ | ✅ |
| [postcss-discard-empty](/optimisations/discardempty) | ✅ | ✅ |
| [postcss-discard-overridden](/optimisations/discardoverridden) | ✅ | ✅ |
| [postcss-discard-unused](/optimisations/discardunused) | ❌ | ✅ |
| [postcss-merge-idents](/optimisations/mergeidents) | ❌ | ✅ |
| [postcss-merge-longhand](/optimisations/mergelonghand) | ✅ | ✅ |
| [postcss-merge-rules](/optimisations/mergerules) | ✅ | ✅ |
| [postcss-minify-font-values](/optimisations/minifyfontvalues) | ✅ | ✅ |
| [postcss-minify-gradients](/optimisations/minifygradients) | ✅ | ✅ |
| [postcss-minify-params](/optimisations/minifyparams) | ✅ | ✅ |
| [postcss-minify-selectors](/optimisations/minifyselectors) | ✅ | ✅ |
| [postcss-normalize-charset](/optimisations/normalizecharset) | ✅ | ✅ |
| [postcss-normalize-display-values](/optimisations/normalizedisplayvalues) | ✅ | ✅ |
| [postcss-normalize-positions](/optimisations/normalizepositions) | ✅ | ✅ |
| [postcss-normalize-repeat-style](/optimisations/normalizerepeatstyle) | ✅ | ✅ |
| [postcss-normalize-string](/optimisations/normalizestring) | ✅ | ✅ |
| [postcss-normalize-timing-functions](/optimisations/normalizetimingfunctions) | ✅ | ✅ |
| [postcss-normalize-unicode](/optimisations/normalizeunicode) | ✅ | ✅ |
| [postcss-normalize-url](/optimisations/normalizeurl) | ✅ | ✅ |
| [postcss-normalize-whitespace](/optimisations/normalizewhitespace) | ✅ | ✅ |
| [postcss-ordered-values](/optimisations/orderedvalues) | ✅ | ✅ |
| [postcss-reduce-idents](/optimisations/reduceidents) | ❌ | ✅ |
| [postcss-reduce-initial](/optimisations/reduceinitial) | ✅ | ✅ |
| [postcss-reduce-transforms](/optimisations/reducetransforms) | ✅ | ✅ |
| [postcss-svgo](/optimisations/svgo) | ✅ | ✅ |
| [postcss-unique-selectors](/optimisations/uniqueselectors) | ✅ | ✅ |
| [postcss-zindex](/optimisations/zindex) | ❌ | ✅ |

You can read more about presets in our [presets guide](/guides/presets/).

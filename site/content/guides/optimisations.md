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
| [cssDeclarationSorter](/optimisations/cssdeclarationsorter) | ✅ | ✅ |
| [rawCache](/optimisations/rawcache) | ✅ | ✅ |
| [calc](/optimisations/calc) | ✅ | ✅ |
| [colormin](/optimisations/colormin) | ✅ | ✅ |
| [convertValues](/optimisations/convertvalues) | ✅ | ✅ |
| [discardComments](/optimisations/discardcomments) | ✅ | ✅ |
| [discardDuplicates](/optimisations/discardduplicates) | ✅ | ✅ |
| [discardEmpty](/optimisations/discardempty) | ✅ | ✅ |
| [discardOverridden](/optimisations/discardoverridden) | ✅ | ✅ |
| [discardUnused](/optimisations/discardunused) | ❌ | ✅ |
| [mergeIdents](/optimisations/mergeidents) | ❌ | ✅ |
| [mergeLonghand](/optimisations/mergelonghand) | ✅ | ✅ |
| [mergeRules](/optimisations/mergerules) | ✅ | ✅ |
| [minifyFontValues](/optimisations/minifyfontvalues) | ✅ | ✅ |
| [minifyGradients](/optimisations/minifygradients) | ✅ | ✅ |
| [minifyParams](/optimisations/minifyparams) | ✅ | ✅ |
| [minifySelectors](/optimisations/minifyselectors) | ✅ | ✅ |
| [normalizeCharset](/optimisations/normalizecharset) | ✅ | ✅ |
| [normalizeDisplayValues](/optimisations/normalizedisplayvalues) | ✅ | ✅ |
| [normalizePositions](/optimisations/normalizepositions) | ✅ | ✅ |
| [normalizeRepeatStyle](/optimisations/normalizerepeatstyle) | ✅ | ✅ |
| [normalizeString](/optimisations/normalizestring) | ✅ | ✅ |
| [normalizeTimingFunctions](/optimisations/normalizetimingfunctions) | ✅ | ✅ |
| [normalizeUnicode](/optimisations/normalizeunicode) | ✅ | ✅ |
| [normalizeUrl](/optimisations/normalizeurl) | ✅ | ✅ |
| [normalizeWhitespace](/optimisations/normalizewhitespace) | ✅ | ✅ |
| [orderedValues](/optimisations/orderedvalues) | ✅ | ✅ |
| [reduceIdents](/optimisations/reduceidents) | ❌ | ✅ |
| [reduceInitial](/optimisations/reduceinitial) | ✅ | ✅ |
| [reduceTransforms](/optimisations/reducetransforms) | ✅ | ✅ |
| [svgo](/optimisations/svgo) | ✅ | ✅ |
| [uniqueSelectors](/optimisations/uniqueselectors) | ✅ | ✅ |
| [zindex](/optimisations/zindex) | ❌ | ✅ |

You can read more about presets in our [presets guide](/guides/presets/).

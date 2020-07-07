---
title: "normalizeCharset"
layout: Optimisation
identifier: normalizecharset
---

<!-- This file was automatically generated. -->


Ensures that only a single `@charset` is present in the CSS file, and moves it
to the top of the document. This prevents multiple, invalid declarations
occurring through naïve CSS concatenation. Note that *by default*, new
`@charset` rules will not be added to the CSS.

---
title: "normalizeUnicode"
layout: Optimisation
identifier: normalizeunicode
---

<!-- This file was automatically generated. -->


This optimisation can convert `unicode-range` descriptors to use the shorter
wildcard ranges when a particular value meets the wildcard criteria. Values will
be converted when the code matches `0` & `f` in the same place on both sides
of the range. So, `u+2000-2fff` can be converted to `u+2???`, but `u+2100-2fff`
will be left as it is.

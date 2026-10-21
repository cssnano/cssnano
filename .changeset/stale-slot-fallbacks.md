---
"cssnano": patch
---

fix(cssnano): drop a longhand's fallback once a later shorthand overrides it

When merge-longhand folds declarations into a shorthand, it keeps an earlier value only while it is still a fallback for the declaration that now sets that side. Before, `a{margin-left:1px;margin-left:var(--a);margin:2px 1px}` kept `margin-left:1px` after removing the `var()` declaration it backed up. A second run then removed it, so the output was larger than needed and running cssnano twice gave a different result. The same applies to `border-radius` and `columns`.

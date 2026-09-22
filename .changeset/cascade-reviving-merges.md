---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
---

Rules with identical selectors now merge without changing which declaration wins the cascade. A rule that repeats a value already overridden inside the earlier rule, or that overrides a later shorthand with a longhand, keeps its declaration instead of being dropped as a duplicate, so the computed styles of merged rules match the original stylesheet.

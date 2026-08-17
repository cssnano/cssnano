---
"postcss-merge-rules": patch
"cssnano": patch
"cssnano-preset-advanced": patch
"cssnano-preset-default": patch
---

perf(postcss-merge-rules): cache negative browser-support results when deciding whether to merge rules

Checking whether a selector feature (a pseudo-class, combinator, or attribute operator) is supported by the target browsers previously skipped the cache whenever the answer was "not supported," so every occurrence of an unsupported feature re-ran the browserslist/caniuse lookup instead of reusing the first result. This is now cached like any other outcome, which speeds up rule merging on stylesheets that use browser-support-gated selectors against restrictive browserslist targets.

---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
---

Declarations whose standard property names differ only in case, such as `COLOR` and `color`, now merge like identically spelled properties. Custom property names stay case-sensitive, so `--FOO` and `--foo` remain distinct declarations.

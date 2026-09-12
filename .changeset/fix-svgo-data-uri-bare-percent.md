---
"postcss-svgo": patch
---

Fix `SvgoParserError` on data URIs that mix percent-encoded characters with a bare, unencoded `%` (e.g. `rgb(0 0 0 / 80%)`). `decode` now decodes each contiguous run of `%XX` escapes as a unit instead of failing the whole string when it also contains a `%` that isn't part of a valid escape.

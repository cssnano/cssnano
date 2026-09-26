---
"postcss-svgo": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Aligns SVG data URI processing with WHATWG URL standards by treating the first `#` as the fragment delimiter. Non-conforming data URLs (such as those with malformed percent-encoding or where an unencoded `#` in markup truncates the SVG payload) are left untouched rather than parsed with an internal XML recovery scanner. CSS hex escapes in the URI scheme (for example `d\61ta:image/svg+xml`) reach the optimizer. SVG data URIs inside CSS Values 4 `src(...)` functions or `url(...)` declarations with url-modifiers are optimized while preserving modifiers and comments. Minified declarations also keep their raw value metadata in sync.

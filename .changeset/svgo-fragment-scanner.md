---
"postcss-svgo": patch
"cssnano-preset-default": patch
"cssnano": patch
---

Splits SVG data URI payloads into document and fragment only after locating the verified root close tag, so `#` characters inside comments, attribute values, and other markup no longer truncate the SVG. Scanning is now a single quote-aware pass that respects percent-encoding, and CSS hex escapes in the URI scheme (for example `d\61ta:image/svg+xml`) reach the optimizer. SVG data URIs inside CSS Values 4 `src(...)` functions or `url(...)` declarations with url-modifiers are now optimized while preserving modifiers and comments. Minified declarations also keep their raw value metadata in sync.

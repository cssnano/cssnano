---
"postcss-normalize-url": major
"cssnano-preset-default": minor
"cssnano-preset-advanced": minor
"cssnano": minor
---

feat(postcss-normalize-url): stop rewriting URLs

The plugin only changes the `url()` token (unquoting, whitespace, escaping) and keeps the URL byte-identical. It no longer removes dot segments or duplicate slashes, decodes percent-escapes, removes default ports or strips the trailing dot of host names, because these are not equivalences for every server. Whitespace inside a quoted `@namespace` URL is kept as well, because the namespace name is an identifier compared character by character rather than a URL that gets fetched.

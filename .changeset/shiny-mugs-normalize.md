---
'postcss-normalize-url': patch
'cssnano-preset-default': patch
'cssnano-preset-advanced': patch
'cssnano': patch
---

Preserve Windows drive roots, directory dot references, and leading `./` prefixes when the first relative segment contains a colon. Decode unreserved percent-encoded octets while preserving percent-encoded dots, normalize `@import` at-rules including nested condition URLs, retain quotes for URLs containing non-printable control characters, avoid unnecessary declaration tokenization, and synchronize raw parameters.


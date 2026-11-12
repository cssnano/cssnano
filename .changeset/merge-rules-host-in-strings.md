---
"cssnano": patch
---

fix(cssnano): mergeRules no longer mistakes text that only looks like `:host` or a mixin for one

Rules whose selectors use the `:host` or `:host-context()` pseudo-class, or end in a colon as a mixin does, are still kept apart. But a `:host` that only appears inside an attribute value, such as `[title=":host"]`, no longer stops a merge, and neither does an escaped colon in a class or element name, such as `.a\:host` or `a\:`.

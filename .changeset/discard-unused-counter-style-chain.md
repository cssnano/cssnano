---
"cssnano": patch
---

`discardUnused` removes a counter style that only an unused counter style extends in the same run, and keeps one that a used counter style names in `fallback` or `speak-as`, or that `counter()`, `counters()`, `target-counter()` or `target-counters()` names in `content`, `bookmark-label` or `copy-into`; it matches escaped names and predefined names in any case, and keeps every counter style when one of those declarations or `list-style` uses a substitution function such as `var()`, `env()`, or an `attr()` with a fallback or a type that yields an identifier

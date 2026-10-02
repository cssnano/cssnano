---
"postcss-merge-idents": patch
"cssnano-preset-advanced": patch
---

Merge identical `@keyframes` and `@counter-style` rules only when every reference keeps pointing at the same definition:

- Names are global, so a rule inside `@media`, `@supports` or `@container` is merged only with a rule inside the same conditions. Rules inside `@scope` are not merged with top-level rules.
- A string name such as `"a"` matches the identifier `a`, and the identifier is kept. References in `-webkit-animation` are updated too.
- A name defined by both `@keyframes` and `@-webkit-keyframes` is not merged with a name defined by only one of them.
- A name used in a custom property or inside a function such as `var()` is never removed, since it may be referenced once the value is substituted.

---
"postcss-merge-idents": patch
"cssnano-preset-advanced": patch
---

Fix `@keyframes` and `@counter-style` merging across conditional rules, string names and prefixed aliases. Names are global, so a definition inside `@media`, `@supports` or `@container` no longer counts as a private scope: two names are merged only when the same at-rules and condition containers define both with the same body. This removes dangling references such as `animation:a` after `a` was removed, and stops references picking up a body that a conditional rule redefines. A definition inside `@scope` is no longer merged with a top-level definition.

A string name and an ident name of the same value are now one name, so `animation:"a"` is rewritten together with `animation:a`, and `@keyframes "x"` can merge with `@keyframes a` in a single pass. References in `-webkit-animation` and the other prefixed properties are rewritten with the rest of the document. Names that only differ in which vendor prefixed at-rules define them are no longer merged.

A name spelled in a custom property value, an `@function` result, an `@property` initial value, or inside any function other than the counter style argument of `counter()` and similar functions is never removed. Such a name may be referenced once `var()`, `env()`, `attr()`, `if()` or a custom function is substituted, and is kept as the name that interchangeable names merge into. A name ending in a hex escape no longer gains a space where a comma follows it, and no longer fuses with the next component when it replaces a string reference or precedes a CRLF. A name ending in an escaped space now merges correctly instead of leaving its references dangling.

A keyframes name written as a string that starts with `--` is kept, because `animation` never reads a `--` ident as a keyframes name. A name in an `@function` or `@mixin` parameter default, or in an `@apply` argument, is kept as well. When a string name and an ident name merge, the ident is kept.

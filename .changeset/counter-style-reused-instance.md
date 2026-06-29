---
"postcss-reduce-idents": patch
---

Do not rename an unreferenced `@counter-style` when the plugin instance is reused across files. The counter-style reducer now tracks references per file like the keyframes reducer, so a stale reference count from an earlier file no longer renames an unreferenced counter style in a later one.

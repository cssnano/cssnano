---
"cssnano": patch
---

fix(cssnano): discardUnused matches font faces by the family name browsers use

A font face now stays when a rule names its family with different quoting, CSS escapes, spacing or ASCII case, and it goes when a used family only contains its name as a substring, such as `"Foo Bar"` for a face named `Foo`. A face with several `font-family` descriptors stays when any of them is used, and a descriptor that is not a single string or a sequence of identifiers keeps the face. A `var()` in a property other than `font`, `font-family`, `animation` or `animation-name` no longer keeps every font face and keyframes rule.

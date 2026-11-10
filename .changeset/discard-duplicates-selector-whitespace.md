---
"cssnano": patch
---

fix(cssnano): selector lists that differ only in the whitespace around their commas are the same list

Duplicate discarding, and the comparison of nested rules' containers, now treat `a, b` and `a,b` as one selector list, so a duplicate declaration under either spelling is removed, as it already was when both are spelled alike. The same holds for keyframe selectors, such as `0%, 100%` and `0%,100%`. A comment with whitespace beside it counts as whitespace there, as in `a /* x */, b`. Whitespace inside a selector still counts, since it can be a combinator, and so does a comment between two of its parts, as in `a/**/.b`.

---
"postcss-discard-comments": patch
"cssnano-preset-default": patch
"cssnano-preset-lite": patch
---

Keep the meaning of selectors when removing a comment between two selector parts. A comment is not whitespace, so a selector such as `.a/*c*/.b` now becomes `.a.b` rather than the descendant selector `.a .b`. Where joining the neighbours would change their tokens, such as `div/*c*/span`, an empty comment stays in place instead of a space.

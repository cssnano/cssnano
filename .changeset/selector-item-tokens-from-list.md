---
"cssnano": patch
---

fix(cssnano): a selector list whose item ends in a backslash stays as written when a neighbouring rule merges into it

A rule such as `.a\` followed by a newline and `,.b` is invalid. When a later rule with the same declarations merged into it, cssnano rewrote it as the valid selector `.a\,.b`. It now keeps the list as written.

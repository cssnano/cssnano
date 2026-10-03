---
"postcss-merge-rules": patch
---

Leave the keyframes of an uppercase `@KEYFRAMES` rule unmerged, as for `@keyframes`. At-rule names are case-insensitive, and merging keyframes repeats a keyframe selector.

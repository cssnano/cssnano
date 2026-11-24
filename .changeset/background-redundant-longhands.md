---
"cssnano": patch
---

fix(cssnano): drop a `background-*` longhand that repeats what the `background` shorthand before it already sets, such as `background-image:none` after `background:red`. Only a single-layer shorthand of keywords, a hex or named colour and a `url()` counts, and only when every target parses it.

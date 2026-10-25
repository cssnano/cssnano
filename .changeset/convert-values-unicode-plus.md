---
"cssnano": patch
---

fix(cssnano): convert-values keeps a `+` number and reads `U+` ranges only in `unicode-range`

Outside `unicode-range`, `margin: u+1.0e2` was read as `u+1` followed by `.0e2` and became `margin: u+10`. Other values now use the default tokenizer, so the value keeps its number (`u+100`). A `+` sign is now dropped only after whitespace, a comment, punctuation or a bracket, so `1px+1.0` becomes `1px+1` instead of the merged token `1px1`, and `-+1.0px` becomes `-+1px` instead of the valid length `-1px`. With `transformCustomProperties`, a custom property that contains a `U+` range is left unchanged, since `--x: u+1.0e2` reads as a range in `unicode-range` and as a number elsewhere.

---
"cssnano": patch
---

fix(cssnano): keep border side colours that fall back for `rgba()` side colours

When each side's colour, such as `border-top-color:#000`, was followed by the same side in `rgba()`, cssnano merged the four `rgba()` sides into one `border-color` and then dropped the earlier colours, so a browser without `rgba()` lost the border colour. The earlier side colours now stay as the fallback.

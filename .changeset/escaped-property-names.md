---
"cssnano": patch
---

fix(cssnano): property names are compared by their decoded spelling

`\63olor:blue` names `color`, so `.a{color:red}.b{\63olor:blue;color:red}` is no longer merged into `.a,.b{color:red}.b{\63olor:blue}`, which changed the color of `.b`. `\61 ll` is `all`, and `--\61:1;--a:1` keeps one copy, since `--\61` is `--a`. Custom properties stay case-sensitive.

---
"postcss-merge-rules": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

Share declarations among several adjacent rules even when sharing them between only two would not shorten the output, which happens with long selectors. Previously rules such as `.long-class-name_a{background-size:contain;height:2vw}` and its siblings stayed unmerged until the selectors were short.

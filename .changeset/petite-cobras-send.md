---
"postcss-svgo": patch
"cssnano-preset-default": patch
"cssnano-preset-advanced": patch
"cssnano": patch
---

fix(postcss-svgo): do not roll our own URI encoding

Our own code, while producing smaller output, might end up producing
the wrong encoding, since it does not encode all characters. 

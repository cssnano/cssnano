---
'postcss-minify-selectors': major
'postcss-discard-comments': major
'postcss-discard-unused': major
'postcss-merge-rules': major
'postcss-unique-selectors': major
stylehacks: major
'cssnano-preset-default': major
'cssnano-preset-advanced': major
'cssnano-preset-lite': major
cssnano: major
---

Adopt `postcss-selector-parser` v8 across cssnano's selector-consuming plugins. The parser now exposes immutable selector snapshots, stricter CSS-tokenizer parsing, explicit attribute quote and case-sensitivity fields, and requires the supported Node.js engine. Valid CSS keeps the existing minification behavior; malformed or unsupported selector spellings may now be rejected by the parser.

# Change Log

## 9.0.6

### Patch Changes

- Stop turning a comment inside a selector into a descendant combinator. A comment is not whitespace, so `div/*c*/span` is not the same selector as `div span`. It now becomes `div/**/span` instead. Comments that can be removed without joining two tokens are still removed, so `.a/*c*/.b` becomes `.a.b`.

## 9.0.5

### Patch Changes

- fix: update browserslist

## 9.0.4

### Patch Changes

- Remove comments more reliably and preserve the ones you keep exactly. Comments are now removed from declaration values that carry `!important`, and comment detection respects CSS token boundaries: text inside unquoted `url()` values and behind escape sequences in strings and identifiers is no longer mistaken for a comment. Kept comments are emitted byte-for-byte, including an unclosed comment at the end of a value, and whitespace inside kept comments is left untouched. Removal state is scoped to each document, so a shared processor no longer carries `removeAllButFirst` first-comment state between runs, and the `remove` callback runs once per comment occurrence. A non-function `remove` option now fails with a `TypeError`.

- perf: median 15% speed increase on test fixtures

- Remove insignificant whitespace around custom-property names and, in standard declarations, around `env()` custom-ident arguments and around comma delimiters in `var()`, `env()`, and `constant()`. Between a custom-property name and its value, only the parser-consumed leading whitespace run is dropped; authored whitespace elsewhere in the value, such as after a preserved comment, is preserved per CSS Variables 1. Required whitespace between distinct tokens and the single whitespace token in an empty fallback remain preserved, and a preserved comment kept between a declaration name and value now survives minification, for custom properties and standard declarations alike. Comment removal in selectors and values no longer fuses the tokens the comment sat between: an attribute case-insensitivity flag or any other name-like token keeps its boundary, and math-operator spacing is restored for every function whose value productions accept `<calc-sum>` arguments (including `calc-size()`, `calc-mix()`, and `random()`). Values without comments are now left byte-for-byte untouched rather than re-spaced.

- Preserves whitespace-only custom-property values while removing comments with context-aware parsing, so downstream minifiers can distinguish whitespace values from empty declarations.

- Updated dependencies:
  - cssnano-utils@8.0.0

## 9.0.3

### Patch Changes

- fix: updae browserslist, mdn-data, autoprefixer

## 9.0.2

### Patch Changes

- fix: update postcss and selector parser

- fix: update PostCSS peer dependency

## 9.0.1

### Patch Changes

- fix: ensure older tools can resolve cssnano packages

## 9.0.0

### Major Changes

- The cssnano packages are now native ESM and require Node `^22.22.3 || ^24.15.0 || >=26.0`. Package subpath imports are no longer supported. See the migration documentation before upgrading.

## 8.0.4

### Patch Changes

- fix: ensure packages reach registry with correct repository field

## 8.0.3

### Patch Changes

- fix: update dependencies

## 8.0.2

### Patch Changes

- chore: regenerate all type definitions with TypeScript 7

- fix: update svgo, autoprefixer and postcss

- fix: update PostCSS

- chore: define package.json exports

- chore: update dependencies

  Update autoprefixer, browserslist, colordx and postcss

## 8.0.1

### Patch Changes

- chore: update the postcss peer dependency
- b245a0b: fix: update caniuse-api
- 3bf3f4d: chore: update postcss-selector-parser

## 8.0.0

### Major Changes

- ea8e33a: chore: drop Node.js 20 support

  Node.js 20 has reached end of life.

### Patch Changes

- aa11a12: chore: update PostCSS

## 7.0.8

### Patch Changes

- 7e56dba: fix: update postcss

## 7.0.7

### Patch Changes

- 322ad33: fix: update postcss peer dependency

## 7.0.6

### Patch Changes

- c3e537a: fix: update postcss-selector-parser

## 7.0.5

### Patch Changes

- f31273c: add the cache for parser & fix the unexpected comment

## 7.0.4

### Patch Changes

- 171b669: chore: update dependencies to latest minor version
- 4772407: chore: update postcss-selector-parser
- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities

## 7.0.3

### Patch Changes

- 1d65a10: fix: update postcss-selector-parser

## 7.0.2

### Patch Changes

- dff5c42: chore: update browserslist and postcss-selector-parser

## 7.0.1

### Patch Changes

- 9e8606a: fix: solve some invalid output when minifying selectors

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

## 6.0.2

### Patch Changes

- enable “go to definition” via declaration maps

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

## 5.1.2

### Patch Changes

- chore: update TypeScript and improve types

## 5.1.1

### Patch Changes

- fix: remove comments with PostCSS 8.4.6 and greater

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.0.3

### Patch Changes

- Publish untranspiled CommonJS source

## 5.0.2

### Patch Changes

- refactor: replace object with map

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-discard-comments@5.0.0...postcss-discard-comments@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-discard-comments

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-discard-comments@5.0.0-rc.2...postcss-discard-comments@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-discard-comments

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-discard-comments@5.0.0-rc.1...postcss-discard-comments@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-discard-comments

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-discard-comments@5.0.0-rc.0...postcss-discard-comments@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-discard-comments

# 5.0.0-rc.0 (2021-02-19)

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Performance Improvements

- **postcss-discard-comments:** increase perf ([#700](https://github.com/cssnano/cssnano/issues/700)) ([84294e9](https://github.com/cssnano/cssnano/commit/84294e97da82bd2fb5cf9299f0a9dc4441c8d70c))

## 4.1.1 (2018-09-24)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

# Change Log

## 7.0.5

### Patch Changes

- 171b669: chore: update dependencies to latest minor version
- 4772407: chore: update postcss-selector-parser
- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities

## 7.0.4

### Patch Changes

- 1d65a10: fix: update postcss-selector-parser

## 7.0.3

### Patch Changes

- dff5c42: chore: update browserslist and postcss-selector-parser

## 7.0.2

### Patch Changes

- 9e8606a: fix: solve some invalid output when minifying selectors

## 7.0.1

### Patch Changes

- c14b9f5: chore: update postcss-selector-parser

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

## 6.0.4

### Patch Changes

- 0856f86: chore: update postcss-selector-parser

## 6.0.3

### Patch Changes

- enable “go to definition” via declaration maps

## 6.0.2

### Patch Changes

- f233b22: chore: update-postcss-selector-parser to 6.0.14
- 26bbbd3: chore: update postcss-selector-parser to 6.0.13
- 1ead72d: chore: update postcss-selector-parser to 6.0.15

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- 18331a6: fix(postcss-minify-selectors): prevent mangling of timeline range names

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

## 5.2.1

### Patch Changes

- fix: preserve similar nested selectors

## 5.2.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.1.3

### Patch Changes

- Publish untranspiled CommonJS source

## 5.1.2

### Patch Changes

- refactor: remove implicit boolean conversion
- refactor: more explicit function dispatch
- refactor: replace array with set
- refactor: replace natural sort with built-in array sort

## 5.1.1 (2022-01-07)

### Patch Changes

- refactor: use Map as a cache

# [5.1.0](https://github.com/cssnano/cssnano/compare/postcss-minify-selectors@5.0.0...postcss-minify-selectors@5.1.0) (2021-05-19)

### Features

- **postcss-minify-selectors:** upgrade postcss-selector-parser ([9bce2b6](https://github.com/cssnano/cssnano/commit/9bce2b6ccfa49c50be05efb0c80c1e3938b650b3))

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-minify-selectors@5.0.0-rc.2...postcss-minify-selectors@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-minify-selectors

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-minify-selectors@5.0.0-rc.1...postcss-minify-selectors@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-minify-selectors

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-minify-selectors@5.0.0-rc.0...postcss-minify-selectors@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-minify-selectors

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-minify-selectors:** added check for node.operator for namespace ([#926](https://github.com/cssnano/cssnano/issues/926)) ([1197451](https://github.com/cssnano/cssnano/commit/11974512810272411256381527fc719a35a7492a))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Performance Improvements

- **postcss-minify-selectors:** increase perf ([#697](https://github.com/cssnano/cssnano/issues/697)) ([043b231](https://github.com/cssnano/cssnano/commit/043b2314cec1358bee3341ba2fd4bfe9e2eacaa2))

## 4.1.1 (2018-09-24)

### Bug Fixes

- better minify selectors with uppercase values ([#609](https://github.com/cssnano/cssnano/issues/609)) ([e753beb](https://github.com/cssnano/cssnano/commit/e753beb4eb8b50f5ad2d17342be4b108e0814544))
- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

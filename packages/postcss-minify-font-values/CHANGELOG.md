# Change Log

## 7.0.1

### Patch Changes

- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

## 6.1.0

### Minor Changes

- 794dc6c: removeQuotes support custom functions to handle css variables

## 6.0.3

### Patch Changes

- enable “go to definition” via declaration maps

## 6.0.2

### Patch Changes

- c2160e3: fix(postcss-minify-font-values): emit correct output when spaces are missing between the font family and other values

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.0.4

### Patch Changes

- Publish untranspiled CommonJS source

## 5.0.3

### Patch Changes

- docs: add missing license files
- refactor: remove implicit boolean conversion

## 5.0.2 (2022-01-07)

### Patch Changes

- refactor: use Map as a cache

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-minify-font-values@5.0.0...postcss-minify-font-values@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-minify-font-values

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-minify-font-values@5.0.0-rc.2...postcss-minify-font-values@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-minify-font-values

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-minify-font-values@5.0.0-rc.1...postcss-minify-font-values@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-minify-font-values

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-minify-font-values@5.0.0-rc.0...postcss-minify-font-values@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-minify-font-values

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-minify-font-values:** correct minify font family with css variables ([#740](https://github.com/cssnano/cssnano/issues/740)) ([fc3eae9](https://github.com/cssnano/cssnano/commit/fc3eae9417974ad0ea38fa055668a2f52493b2ec))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.3 (2018-09-25)

## 4.1.1 (2018-09-24)

### Bug Fixes

- minify uppercase `weight` values in `font` property ([#612](https://github.com/cssnano/cssnano/issues/612)) ([a520e69](https://github.com/cssnano/cssnano/commit/a520e6906e7fa17951a64769f030ed7b6f44c38a))
- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

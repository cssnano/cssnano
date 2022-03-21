# Change Log

## 5.1.1

### Patch Changes

- fix: correct package.json dependency version specifier

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

### Patch Changes

- Updated dependencies
  - cssnano-utils@3.1.0

## 5.0.6

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - cssnano-utils@3.0.2

## 5.0.5

### Patch Changes

- refactor: replace array with set
- Updated dependencies
  - cssnano-utils@3.0.1

## 5.0.4 (2022-01-07)

### Patch Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

- Updated dependencies
  - cssnano-utils@3.0.0

# 5.0.3 (2021-11-01)

### Bug fixes

- **postcss-minify-gradients:** handle 2 color-stop-length in linear gradient ([#1215](https://github.com/cssnano/cssnano/pull/1215)) ([8bb7ba6c](https://github.com/cssnano/cssnano/commit/8bb7ba6c1733fd12122589169d847b1a1212a6b5))

# 5.0.2 (2021-08-18)

## Chore

- **postcss-minify-gradients:** remove extra dependencies ([#1181](https://github.com/cssnano/cssnano/pull/1181)) ([50eb53](https://github.com/cssnano/cssnano/commit/50eb53e63b6eaae598ae4e51d02255ec8dcc9c8f))

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-minify-gradients@5.0.0...postcss-minify-gradients@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-minify-gradients

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-minify-gradients@5.0.0-rc.2...postcss-minify-gradients@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-minify-gradients

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-minify-gradients@5.0.0-rc.1...postcss-minify-gradients@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-minify-gradients

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-minify-gradients@5.0.0-rc.0...postcss-minify-gradients@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-minify-gradients

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-minify-gradients:** don't break gradients with `var` and `env` functions ([#735](https://github.com/cssnano/cssnano/issues/735)) ([7fabd9d](https://github.com/cssnano/cssnano/commit/7fabd9d03c81142c5854d0c0a50bee15ed86c219))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Bug Fixes

- **postcss-minify-gradients:** handle uppercase ([#706](https://github.com/cssnano/cssnano/issues/706)) ([acd5d0e](https://github.com/cssnano/cssnano/commit/acd5d0eb59e76fe62b70faad89d6ee0f76f798ef))

## 4.1.1 (2018-09-24)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

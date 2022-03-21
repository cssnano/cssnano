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

## 5.0.3

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - cssnano-utils@3.0.2

## 5.0.2 (2022-01-07)

### Patch Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

- Updated dependencies
  - cssnano-utils@3.0.0

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-merge-idents@5.0.0...postcss-merge-idents@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-merge-idents

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-merge-idents@5.0.0-rc.2...postcss-merge-idents@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-merge-idents

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-merge-idents@5.0.0-rc.1...postcss-merge-idents@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-merge-idents

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-merge-idents@5.0.0-rc.0...postcss-merge-idents@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-merge-idents

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **merge-rules, merge-idents:** add support for nested at-rules ([#719](https://github.com/cssnano/cssnano/issues/719)) ([cdedda7](https://github.com/cssnano/cssnano/commit/cdedda7f9d67873d872add044ad34c91616579f3))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.1 (2018-09-24)

### Bug Fixes

- better handle uppercase atrule and properties in `postcss-merge-idents` ([#610](https://github.com/cssnano/cssnano/issues/610)) ([d177936](https://github.com/cssnano/cssnano/commit/d177936b2656ad286490bedc3c4ab9773a63e5bc))
- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

# Change Log

## 7.0.1

### Patch Changes

- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities

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

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.0.3

### Patch Changes

- Publish untranspiled CommonJS source

## 5.0.2 (2022-01-07)

### Patch Changes

- refactor: use Map as a cache

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-normalize-timing-functions@5.0.0...postcss-normalize-timing-functions@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-normalize-timing-functions

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-normalize-timing-functions@5.0.0-rc.2...postcss-normalize-timing-functions@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-normalize-timing-functions

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-normalize-timing-functions@5.0.0-rc.1...postcss-normalize-timing-functions@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-normalize-timing-functions

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-normalize-timing-functions@5.0.0-rc.0...postcss-normalize-timing-functions@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-normalize-timing-functions

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-normalize-timing-functions:** do not break invalid syntax ([#748](https://github.com/cssnano/cssnano/issues/748)) ([efd2077](https://github.com/cssnano/cssnano/commit/efd20775be85f9845cb343c69b5dc1bb25672a42))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Bug Fixes

- **postcss-normalize-timing-functions:** cache ([#693](https://github.com/cssnano/cssnano/issues/693)) ([7e6e481](https://github.com/cssnano/cssnano/commit/7e6e481244964bf77a1085d8db3f516597b264e9))

### Performance Improvements

- **postcss-normalize-timing-functions:** increase perf ([#687](https://github.com/cssnano/cssnano/issues/687)) ([2bef7d1](https://github.com/cssnano/cssnano/commit/2bef7d1f4f9f6dc33d0a4fb120926a85b08403e7))

## 4.1.1 (2018-09-24)

### Bug Fixes

- do not lowercased property ([#606](https://github.com/cssnano/cssnano/issues/606)) ([d40c657](https://github.com/cssnano/cssnano/commit/d40c6577f1d942d00aade671f5e7ab422870c517))
- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

# Change Log

## 7.1.0

### Minor Changes

- 98dd8f6: Update to svgo 4.0

## 7.0.2

### Patch Changes

- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities

## 7.0.1

### Patch Changes

- 759e16e: chore(svgo): update svgo version as svgo 3.3.0 and 3.3.1 contain unintended breaking changes

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

## 6.0.3

### Patch Changes

- enable “go to definition” via declaration maps

## 6.0.2

### Patch Changes

- b1aea33: chore: update svgo to 3.2.0
- 42249e7: chore(postcss-svgo): update SVGO to 3.1.0

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- 18331a6: deps(postcss-svgo): update SVGO to 3.0.5 and update doc

## 6.0.0

### Major Changes

- 4e272f88: Upgrade dependency svgo to v3 and increase the minimum supported node version to v14.

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.0.4

### Patch Changes

- Publish untranspiled CommonJS source

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 5.0.3 (2021-11-01)

### Bug fixes

- **postcss-svgo:** normalize SVG with escaped quote characters ([#1200](https://github.com/cssnano/cssnano/pull/1200)) ([4ef5e41](https://github.com/cssnano/cssnano/commit/4ef5e41a6c61a23094001da82a76321ca746b22f))

### Chore

- **postcss-svgo:** update svgo to 2.7 ([#1209](https://github.com/cssnano/cssnano/pull/1209))
  ([2b5841](https://github.com/cssnano/cssnano/commit/2b5841e06808f9c04e03c07b5da0f5a36de88cd3))

## 5.0.2 (2021-05-28)

### Bug fixes

- Prevent crash when input contains relative URL (https://github.com/cssnano/cssnano/commit/0ff1716e4cd69152ad1f98d512fdeb6f311e8ad5)

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-svgo@5.0.0...postcss-svgo@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-svgo

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-svgo@5.0.0-rc.2...postcss-svgo@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-svgo

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-svgo@5.0.0-rc.1...postcss-svgo@5.0.0-rc.2) (2021-03-15)

### Bug Fixes

- update SVGO ([aa07cfd](https://github.com/cssnano/cssnano/commit/aa07cfd62c82ed4b1e87219eea8d0ed99635e4ca))

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-svgo@5.0.0-rc.0...postcss-svgo@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-svgo

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- preserve base64 url suffixes in postcss-svgo ([#808](https://github.com/cssnano/cssnano/issues/808)) ([4336afd](https://github.com/cssnano/cssnano/commit/4336afdfc602004bb8b74ed19c0846914d87493d))
- **postcss-svgo:** security problem with `js-yaml` ([#736](https://github.com/cssnano/cssnano/issues/736)) ([7241049](https://github.com/cssnano/cssnano/commit/724104992e22d1b51e65383a9c6fbeb89a6a73f0))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Performance Improvements

- **postcss-svgo:** increase perf ([#698](https://github.com/cssnano/cssnano/issues/698)) ([829bd7c](https://github.com/cssnano/cssnano/commit/829bd7c2fa4a3505c74fe500b08d66f66178788b))

## 4.1.2 (2018-09-25)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

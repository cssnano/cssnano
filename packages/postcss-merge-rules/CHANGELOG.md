# Change Log

## 5.1.3

### Patch Changes

- fix: update autoprefixer and browserslist

## 5.1.2

### Patch Changes

- chore: update TypeScript and improve types

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

- refactor: remove implicit boolean conversion
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

# 5.0.3 (2021-11-16)

### Chore

- 31d5c07dc07a4: refactor: drop one-liner dependencies

## 5.0.2 (2021-05-28)

### Bug fixes

- Check all intersections when merging rules (https://github.com/cssnano/cssnano/commit/069c4249dc10a71e0fef455bf4ebea17776dbcf2)

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-merge-rules@5.0.0...postcss-merge-rules@5.0.1) (2021-05-19)

### Bug Fixes

- **postcss-merge-rules:** add some missing known pseudo classes. ([#1099](https://github.com/cssnano/cssnano/issues/1099)) ([4d7fe36](https://github.com/cssnano/cssnano/commit/4d7fe367bebab86c7b5664ed4621ee7586ca7d86))
- **postcss-merge-rules:** prevent breaking rule merges ([#1072](https://github.com/cssnano/cssnano/issues/1072)) ([c5e0a5e](https://github.com/cssnano/cssnano/commit/c5e0a5eac171089ae994fcba21d9c565fb462577)), closes [#999](https://github.com/cssnano/cssnano/issues/999)

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-merge-rules@5.0.0-rc.2...postcss-merge-rules@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-merge-rules

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-merge-rules@5.0.0-rc.1...postcss-merge-rules@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-merge-rules

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-merge-rules@5.0.0-rc.0...postcss-merge-rules@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-merge-rules

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- don't unsafe merge 'all' declaration ([#872](https://github.com/cssnano/cssnano/issues/872)) ([6ea9e5d](https://github.com/cssnano/cssnano/commit/6ea9e5dcad2d8ea22be7209332ee29d352c807de))
- focus-visible issue ([#882](https://github.com/cssnano/cssnano/issues/882)) ([4cfcaaf](https://github.com/cssnano/cssnano/commit/4cfcaaf25b162ec2b0308907a408d7dba6a354c3))
- **merge-rules, merge-idents:** add support for nested at-rules ([#719](https://github.com/cssnano/cssnano/issues/719)) ([cdedda7](https://github.com/cssnano/cssnano/commit/cdedda7f9d67873d872add044ad34c91616579f3))
- **postcss-merge-rules:** don't change specificity of prefixed properties ([#723](https://github.com/cssnano/cssnano/issues/723)) ([863cf2b](https://github.com/cssnano/cssnano/commit/863cf2b3470d3172523a3165dc368abcfa18809c))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))
- **postcss-merge-rules:** merge at-rules ([#722](https://github.com/cssnano/cssnano/issues/722)) ([8d4610a](https://github.com/cssnano/cssnano/commit/8d4610a6391ddab29bcb08ef0522d0b7ce2d6582))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Performance Improvements

- **postcss-merge-rules:** increase perf ([#681](https://github.com/cssnano/cssnano/issues/681)) ([35bad2b](https://github.com/cssnano/cssnano/commit/35bad2b70fca5390c88eaabc24c25bb8d28b2f95))

## 4.1.1 (2018-09-24)

### Bug Fixes

- handle uppercase `all` property in merge rules ([#611](https://github.com/cssnano/cssnano/issues/611)) ([0dfe335](https://github.com/cssnano/cssnano/commit/0dfe3355951fa4a080a04dca34c6d99420def7ac))
- merge same atrules with difference case ([#605](https://github.com/cssnano/cssnano/issues/605)) ([ca350fd](https://github.com/cssnano/cssnano/commit/ca350fda779bab5ca2eadf70299d92f8e495a273))
- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

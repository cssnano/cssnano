# Change Log

## 3.1.0

### Minor Changes

- feature: add TypeScript type declarations

## 3.0.2

### Patch Changes

- Publish untranspiled CommonJS source

## 3.0.1

### Patch Changes

- docs: add missing license files

## 3.0.0 (2022-01-07)

### Major Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

## [2.0.1](https://github.com/cssnano/cssnano/compare/cssnano-utils@2.0.0...cssnano-utils@2.0.1) (2021-05-19)

**Note:** Version bump only for package cssnano-utils

# [2.0.0](https://github.com/cssnano/cssnano/compare/cssnano-utils@2.0.0-rc.2...cssnano-utils@2.0.0) (2021-04-06)

**Note:** Version bump only for package cssnano-utils

# [2.0.0-rc.2](https://github.com/cssnano/cssnano/compare/cssnano-utils@2.0.0-rc.1...cssnano-utils@2.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package cssnano-utils

# [2.0.0-rc.1](https://github.com/cssnano/cssnano/compare/cssnano-utils@2.0.0-rc.0...cssnano-utils@2.0.0-rc.1) (2021-03-04)

### Bug Fixes

- **cssnano-utils:** get rid of deprecation warning ([752a270](https://github.com/cssnano/cssnano/commit/752a2701085f45367a1e4a558fb9ec768ac760af))

# 2.0.0-rc.0 (2021-02-19)

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`

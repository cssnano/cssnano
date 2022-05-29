# Change Log

## 2.1.3

### Patch Changes

- chore: update TypeScript and improve types
- Updated dependencies
  - postcss-discard-comments@5.1.2

## 2.1.2

### Patch Changes

- fix: correct package.json dependency version specifier

## 2.1.1

### Patch Changes

- fix: improve type declarations

## 2.1.0

### Minor Changes

- feature: add TypeScript type declarations

### Patch Changes

- Updated dependencies
  - cssnano-utils@3.1.0
  - postcss-discard-comments@5.1.0
  - postcss-discard-empty@5.1.0
  - postcss-normalize-whitespace@5.1.0

## 2.0.3

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - cssnano-utils@3.0.2
  - postcss-discard-comments@5.0.3
  - postcss-discard-empty@5.0.3
  - postcss-normalize-whitespace@5.0.4

## 2.0.2 (2022-01-07)

### Patch Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

- Updated dependencies
  - cssnano-utils@3.0.0
  - postcss-normalize-whitespace@5.0.2

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.1](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0...cssnano-preset-lite@2.0.1) (2021-05-19)

**Note:** Version bump only for package cssnano-preset-lite

# [2.0.0](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0-rc.2...cssnano-preset-lite@2.0.0) (2021-04-06)

**Note:** Version bump only for package cssnano-preset-lite

# [2.0.0-rc.2](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0-rc.1...cssnano-preset-lite@2.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package cssnano-preset-lite

# [2.0.0-rc.1](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0-rc.0...cssnano-preset-lite@2.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package cssnano-preset-lite

# 2.0.0-rc.0 (2021-02-19)

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`

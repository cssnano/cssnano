# Change Log

## 5.1.3

### Patch Changes

- fix: update autoprefixer and browserslist

## 5.1.2

### Patch Changes

- chore: update TypeScript and improve types

## 5.1.1

### Patch Changes

- postcss-convert-values: preserve percentage sign on IE 11

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.0.4

### Patch Changes

- Publish untranspiled CommonJS source

## 5.0.3

### Patch Changes

- refactor: remove implicit boolean conversion

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# 5.0.2 (2021-11-01)

### Bug fixes

- **postcss-convert-values:** preserve percentage-only properties ([#1212](https://github.com/cssnano/cssnano/pull/1212)) ([8f3453](https://github.com/cssnano/cssnano/commit/8f345385b210cf85e9d591382d387f76ca4b0f64))

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-convert-values@5.0.0...postcss-convert-values@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-convert-values

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-convert-values@5.0.0-rc.2...postcss-convert-values@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-convert-values

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-convert-values@5.0.0-rc.1...postcss-convert-values@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-convert-values

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-convert-values@5.0.0-rc.0...postcss-convert-values@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-convert-values

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- Keep math functions together ([#895](https://github.com/cssnano/cssnano/issues/895)) ([4ddf843](https://github.com/cssnano/cssnano/commit/4ddf843ca5dc64059f488113224e76165211a669))
- preservation of opacities defined as percentages ([#881](https://github.com/cssnano/cssnano/issues/881)) ([fd7b878](https://github.com/cssnano/cssnano/commit/fd7b878e72ed9bd20c145c9e2daa7b5d48cb1117))
- units being removed in math functions ([#894](https://github.com/cssnano/cssnano/issues/894)) ([1ccbd5b](https://github.com/cssnano/cssnano/commit/1ccbd5b29e1b2121efaf7b24a69aa782848966dc))
- **postcss-convert-values:** prevent zero units from being dropped in line-height. ([#801](https://github.com/cssnano/cssnano/issues/801)) ([d781855](https://github.com/cssnano/cssnano/commit/d78185567ae5ebcde0469cf0e55145a7a3130d3e))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.1 (2018-09-24)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

# Change Log

## 7.0.6

### Patch Changes

- 906a785: fix: update browserslist

## 7.0.5

### Patch Changes

- 2f03871: fix: update lilconfig and browserslist
- 171b669: chore: update dependencies to latest minor version
- fix(postcss-convert-values): preserve percent sign in at-rules with double quotes
- 20f4eb6: fix: update browserslist
- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities

## 7.0.4

### Patch Changes

- 34bdcb8: fix(postcss-convert-values): convert 0ms to 0s

## 7.0.3

### Patch Changes

- dff5c42: chore: update browserslist and postcss-selector-parser
- f14a898: chore: update all dependencies

## 7.0.2

### Patch Changes

- d6f9a32: fix(postcss-convert-values): preserve percent sign in border-image-width

## 7.0.1

### Patch Changes

- 0c85fa9: fix: update Browserslist version
- 30981b7: fix(postcss-convert-values): preserve percentage sign after 0 in more cases

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

## 6.1.0

### Minor Changes

- feat: add preset and plugin options for browserslist

### Patch Changes

- enable “go to definition” via declaration maps
- fix: add missing type declarations to plugins with options

## 6.0.4

### Patch Changes

- 83d3268: chore: update autoprefixer and browerslist

## 6.0.3

### Patch Changes

- 3757056: fix: handle cases where AtRules might not have any children nodes

## 6.0.2

### Patch Changes

- 26bbbd3: chore: update minimum browserslist version to 4.22.2
- 26bbbd3: chore: update postcss-selector-parser to 6.0.13

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- 18331a6: fix(postcss-convert-values): keep percent unit in @Property

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

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

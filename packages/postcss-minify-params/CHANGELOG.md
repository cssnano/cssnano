# Change Log

## 7.0.4

### Patch Changes

- 906a785: fix: update browserslist

## 7.0.3

### Patch Changes

- 2f03871: fix: update lilconfig and browserslist
- 171b669: chore: update dependencies to latest minor version
- 20f4eb6: fix: update browserslist
- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities
- Updated dependencies [5672148]
  - cssnano-utils@5.0.1

## 7.0.2

### Patch Changes

- dff5c42: chore: update browserslist and postcss-selector-parser
- f14a898: chore: update all dependencies

## 7.0.1

### Patch Changes

- 0c85fa9: fix: update Browserslist version

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

### Patch Changes

- Updated dependencies [0d10597]
  - cssnano-utils@5.0.0

## 6.1.0

### Minor Changes

- feat: add preset and plugin options for browserslist

### Patch Changes

- enable “go to definition” via declaration maps
- fix: add missing type declarations to plugins with options
- Updated dependencies
  - cssnano-utils@4.0.2

## 6.0.3

### Patch Changes

- 83d3268: chore: update autoprefixer and browerslist

## 6.0.2

### Patch Changes

- 26bbbd3: chore: update minimum browserslist version to 4.22.2
- 26bbbd3: chore: update postcss-selector-parser to 6.0.13

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- Updated dependencies [18331a6]
  - cssnano-utils@4.0.1

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

### Patch Changes

- Updated dependencies [ca9d3f55]
  - cssnano-utils@4.0.0

## 5.1.4

### Patch Changes

- fix: update autoprefixer and browserslist

## 5.1.3

### Patch Changes

- refactor: change function bind to arrow function

## 5.1.2

### Patch Changes

- fix: correct package.json dependency version specifier

## 5.1.1

### Patch Changes

- fix: preserve empty custom properties and ensure they work in Chrome

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

### Patch Changes

- Updated dependencies
  - cssnano-utils@3.1.0

## 5.0.5

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - cssnano-utils@3.0.2

## 5.0.4

### Patch Changes

- docs: add missing license files
- refactor: remove implicit boolean conversion
- refactor: replace natural sort with built-in array sort
- Updated dependencies
  - cssnano-utils@3.0.1

## 5.0.3 (2022-01-07)

### Patch Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

- Updated dependencies
  - cssnano-utils@3.0.0

# 5.0.2 (2021-11-16)

### Chore

- 31d5c07dc07a4: refactor: drop one-liner dependencies

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-minify-params@5.0.0...postcss-minify-params@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-minify-params

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-minify-params@5.0.0-rc.2...postcss-minify-params@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-minify-params

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-minify-params@5.0.0-rc.1...postcss-minify-params@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-minify-params

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-minify-params@5.0.0-rc.0...postcss-minify-params@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-minify-params

# 5.0.0-rc.0 (2021-02-19)

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Bug Fixes

- do not mangle `[@page](https://github.com/page) :first` rules ([#678](https://github.com/cssnano/cssnano/issues/678)) ([69aab0b](https://github.com/cssnano/cssnano/commit/69aab0b527198979e2232a57554cf888ad868231))

### Performance Improvements

- **postcss-minify-params:** increase perf ([e06a24e](https://github.com/cssnano/cssnano/commit/e06a24e44aae8935290b7bc05d9da51b99367d2b))

## 4.1.1 (2018-09-24)

### Bug Fixes

- add `browserslist` to dependencies for `postcss-minify-params` ([#594](https://github.com/cssnano/cssnano/issues/594)) ([9d40806](https://github.com/cssnano/cssnano/commit/9d40806151026dcd2272dc22a76009b27224d512))
- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

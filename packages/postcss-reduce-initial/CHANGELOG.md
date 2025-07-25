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

## 6.1.0

### Minor Changes

- feat: add preset and plugin options for browserslist

### Patch Changes

- enable “go to definition” via declaration maps
- fix: add missing type declarations to plugins with options

## 6.0.3

### Patch Changes

- 83d3268: chore: update autoprefixer and browerslist
- c4be0f5: fix(postcss-reduce-initial): update initial property list

## 6.0.2

### Patch Changes

- 26bbbd3: chore: update minimum browserslist version to 4.22.2
- 26bbbd3: chore: update postcss-selector-parser to 6.0.13
- 43d6898: fix(postcss-reduce-initial): update CSS initial properties

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

### Patch Changes

- fix(postcss-reduce-initial): ensure options have an effect

## 5.1.2

### Patch Changes

- fix(postcsss-reduce-initial): fix mask-repeat conversion

## 5.1.1

### Patch Changes

- fix: update autoprefixer and browserslist
- fix(postcss-reduce-initial): improve initial properties data

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.0.3

### Patch Changes

- Publish untranspiled CommonJS source

## 5.0.2 (2021-11-27)

### Bug fixes

- fix(postcss-reduce-initial): update initial values data ([#1242](https://github.com/cssnano/cssnano/pull/1242)) ([c6e9f00b785](https://github.com/cssnano/cssnano/commit/c6e9f00b785d85df0d92a110ec95a14fd98adcc9))

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-reduce-initial@5.0.0...postcss-reduce-initial@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-reduce-initial

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-reduce-initial@5.0.0-rc.2...postcss-reduce-initial@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-reduce-initial

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-reduce-initial@5.0.0-rc.1...postcss-reduce-initial@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-reduce-initial

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-reduce-initial@5.0.0-rc.0...postcss-reduce-initial@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-reduce-initial

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- min-width/height issue ([#852](https://github.com/cssnano/cssnano/issues/852)) ([f6e767b](https://github.com/cssnano/cssnano/commit/f6e767b7ba672c5c1b4a1350f23b4b65a4851f96))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))
- **postcss-reduce-initial:** added ignore options ([#929](https://github.com/cssnano/cssnano/issues/929)) ([2e63fe5](https://github.com/cssnano/cssnano/commit/2e63fe55b8059fc14d78aa11920d7ebf9a3682a1))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Bug Fixes

- **postcss-reduce-initial:** handle uppercase value toInitial ([#685](https://github.com/cssnano/cssnano/issues/685)) ([0e7beb3](https://github.com/cssnano/cssnano/commit/0e7beb3508fa8f85db67e3464bf8b8941bb6ca12))
- change mask-repeat initial value on repeat ([#679](https://github.com/cssnano/cssnano/issues/679)) ([cebd6d5](https://github.com/cssnano/cssnano/commit/cebd6d5b789a9c700f92dc8b40cdd8ef9545441a))

## 4.1.1 (2018-09-24)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

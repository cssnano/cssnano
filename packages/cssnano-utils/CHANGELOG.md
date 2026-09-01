# Change Log

## 7.0.1

### Patch Changes

- fix: ensure older tools can resolve cssnano packages

## 7.0.0

### Major Changes

- The cssnano packages are now native ESM and require Node `^22.22.3 || ^24.15.0 || >=26.0`. Package subpath imports are no longer supported. See the migration documentation before upgrading.

## 6.0.4

### Patch Changes

- fix: ensure packages reach registry with correct repository field

## 6.0.3

### Patch Changes

- fix: update dependencies

## 6.0.2

### Patch Changes

- chore: regenerate all type definitions with TypeScript 7

- fix: update svgo, autoprefixer and postcss

- fix: update PostCSS

- chore: define package.json exports

- chore: update dependencies

  Update autoprefixer, browserslist, colordx and postcss

## 6.0.1

### Patch Changes

- chore: update the postcss peer dependency

## 6.0.0

### Major Changes

- ea8e33a: chore: drop Node.js 20 support

  Node.js 20 has reached end of life.

### Patch Changes

- aa11a12: chore: update PostCSS

## 5.0.3

### Patch Changes

- 7e56dba: fix: update postcss

## 5.0.2

### Patch Changes

- 322ad33: fix: update postcss peer dependency

## 5.0.1

### Patch Changes

- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities

## 5.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

## 4.0.2

### Patch Changes

- enable “go to definition” via declaration maps

## 4.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue

## 4.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

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

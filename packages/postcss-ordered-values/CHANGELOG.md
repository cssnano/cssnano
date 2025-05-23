# Change Log

## 7.0.2

### Patch Changes

- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities
- Updated dependencies [5672148]
  - cssnano-utils@5.0.1

## 7.0.1

### Patch Changes

- c192461: fix(postcss-orderded-values): fix incorrect order in animations

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

### Patch Changes

- Updated dependencies [0d10597]
  - cssnano-utils@5.0.0

## 6.0.2

### Patch Changes

- enable “go to definition” via declaration maps
- Updated dependencies
  - cssnano-utils@4.0.2

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

## 5.1.3

### Patch Changes

- fix: recognize 'constant' as a function

## 5.1.2

### Patch Changes

- fix: preserve constant values

## 5.1.1

### Patch Changes

- fix: correct package.json dependency version specifier

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

- refactor: remove implicit boolean conversion
- refactor: replace array with set
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

# 5.0.2 (2021-06-09)

### Bug fixes

**postcss-ordered-values**: preserve columns count (#1144)
([9acd6a2fe3e](https://github.com/cssnano/cssnano/commit/9acd6a2fe3e188a5f29fef91cf406495fa74a877))

# [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-ordered-values@5.0.0...postcss-ordered-values@5.0.1) (2021-05-19)

**Note:** Version bump only for package postcss-ordered-values

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-ordered-values@5.0.0-rc.2...postcss-ordered-values@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-ordered-values

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-ordered-values@5.0.0-rc.1...postcss-ordered-values@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-ordered-values

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-ordered-values@5.0.0-rc.0...postcss-ordered-values@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-ordered-values

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-ordered-values:** columns transform returning string instead of the AST ([#928](https://github.com/cssnano/cssnano/issues/928)) ([a5d6d36](https://github.com/cssnano/cssnano/commit/a5d6d364e0815ecb198a95de301f3554ccce4f78))
- **postcss-ordered-values:** respect env function ([#755](https://github.com/cssnano/cssnano/issues/755)) ([3122aae](https://github.com/cssnano/cssnano/commit/3122aae20900500198223830fafec93275d5b375))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- added support for grid-\* ([#863](https://github.com/cssnano/cssnano/issues/863)) ([b720b69](https://github.com/cssnano/cssnano/commit/b720b69522ba5127699afc1fa131b425d68b4c08))
- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))
- **ordered-values:** added support for columns and column-rule ([#861](https://github.com/cssnano/cssnano/issues/861)) ([126fc7f](https://github.com/cssnano/cssnano/commit/126fc7ff618fde86b4f15c5d07cb57e882810526))
- **ordered-values:** added support for more border props ([#858](https://github.com/cssnano/cssnano/issues/858)) ([8243401](https://github.com/cssnano/cssnano/commit/8243401cfd483b99e8d0458d39acde1779b15755))
- **postcss-ordered-values:** compress more vendor properties ([#746](https://github.com/cssnano/cssnano/issues/746)) ([b479440](https://github.com/cssnano/cssnano/commit/b4794404bffa54558654b215eb550e6adb98e144))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Performance Improvements

- **postcss-ordered-values:** increase perf ([#692](https://github.com/cssnano/cssnano/issues/692)) ([4aca28b](https://github.com/cssnano/cssnano/commit/4aca28b1930e355246c9c5a1266507013ca473fa))

## 4.1.1 (2018-09-24)

# 4.1.0 (2018-08-24)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

### Features

- **postcss-ordered-values:** support ordering animation values ([#574](https://github.com/cssnano/cssnano/issues/574)) ([17ec039](https://github.com/cssnano/cssnano/commit/17ec039dfbe7f596df12f5d5889bf3e6cd32afd6))

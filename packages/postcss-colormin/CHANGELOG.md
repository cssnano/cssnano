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

## 6.0.3

### Patch Changes

- 83d3268: chore: update autoprefixer and browerslist
- f461389: chore: update colord version

## 6.0.2

### Patch Changes

- 26bbbd3: chore: update minimum browserslist version to 4.22.2
- 26bbbd3: chore: update postcss-selector-parser to 6.0.13

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

## 5.3.1

### Patch Changes

- fix(postcss-colormin): don't minify colors in src declarations

## 5.3.0

### Minor Changes

- feature: add TypeScript type declarations

## 5.2.5

### Patch Changes

- Publish untranspiled CommonJS source

## 5.2.4

### Patch Changes

- refactor: remove implicit boolean conversion
- refactor: replace array with set

## 5.2.3 (2022-01-07)

### Patch Changes

- refactor: use Map as a cache

## 5.2.2 (2021-12-16)

### Patch Changes

- fix(postcss-colormin): accept configuration options ([#1263](https://github.com/cssnano/cssnano/pull/1263))([3b38038007](https://github.com/cssnano/cssnano/commit/3b38038007bfd8761d84a9e35f0191b56e5b50d7))

# 5.2.1 (2021-11-01)

### Chore

- **postcss-colormin:** use colord plugin for color minification ([#1207](https://github.com/cssnano/cssnano/pull/1207)) ([3dbaa04](https://github.com/cssnano/cssnano/commit/3dbaa04addfa2f18375262377e172b03819dc2c0))

# 5.2.0 (2021-05-28)

### Features

- Output 4 and 8 hex colors if it reduces the output size and the target browsers support it.

### Bug Fixes

- Preserve color alpha precision.

# 5.1.1 (2021-05-21)

### Bug Fixes

- **postcss-colormin:** Strict color parsing ([#1122](https://github.com/cssnano/cssnano/issues/1122)) ([32771da](https://github.com/cssnano/cssnano/commit/32771da46ee94f07a6907ec47701189f90ad2ec0))
- **postcss-colormin:** fix ERR_PACKAGE_PATH_NOT_EXPORTED ([#1110](https://github.com/cssnano/cssnano/issues/1110)) ([8a31ca38796](https://github.com/cssnano/cssnano/commit/8a31ca38796e12e6fe52620cf8a545cb058fe295))

# [5.1.0](https://github.com/cssnano/cssnano/compare/postcss-colormin@5.0.0...postcss-colormin@5.1.0) (2021-05-19)

### Features

- **postcss-colormin:** switch to colord and solve multiple issues ([#1107](https://github.com/cssnano/cssnano/issues/1107)) ([a7f0be4](https://github.com/cssnano/cssnano/commit/a7f0be4acc640aab89cace53a720b3d59b6f7b4f)), closes [#819](https://github.com/cssnano/cssnano/issues/819) [#1042](https://github.com/cssnano/cssnano/issues/1042) [#819](https://github.com/cssnano/cssnano/issues/819) [#771](https://github.com/cssnano/cssnano/issues/771)

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-colormin@5.0.0-rc.2...postcss-colormin@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-colormin

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-colormin@5.0.0-rc.1...postcss-colormin@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-colormin

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-colormin@5.0.0-rc.0...postcss-colormin@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-colormin

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-colormin:** fixed plugin running error ([#856](https://github.com/cssnano/cssnano/issues/856)) ([eb37dd5](https://github.com/cssnano/cssnano/commit/eb37dd570a916ce7d6080a782a24d951082c5497))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Performance Improvements

- **postcss-colormin:** increase ([#682](https://github.com/cssnano/cssnano/issues/682)) ([73e021e](https://github.com/cssnano/cssnano/commit/73e021e0fd02ab44c8726ae0719c5669a29bc8dc))
- **postcss-colormin:** increase perf ([#696](https://github.com/cssnano/cssnano/issues/696)) ([88c2f2e](https://github.com/cssnano/cssnano/commit/88c2f2e0c20fcd3f3be20b10501e0cec9e453aeb))

## 4.1.1 (2018-09-24)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

# Change Log

## 7.0.5

### Patch Changes

- e09cf7e: fix: update TypeScript declarations
- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities
- Updated dependencies [2f03871]
- Updated dependencies [171b669]
- Updated dependencies [4772407]
- Updated dependencies [20f4eb6]
- Updated dependencies [5672148]
  - stylehacks@7.0.5

## 7.0.4

### Patch Changes

- Updated dependencies [1d65a10]
  - stylehacks@7.0.4

## 7.0.3

### Patch Changes

- Updated dependencies [dff5c42]
- Updated dependencies [f14a898]
  - stylehacks@7.0.3

## 7.0.2

### Patch Changes

- Updated dependencies [0c85fa9]
  - stylehacks@7.0.2

## 7.0.1

### Patch Changes

- Updated dependencies [c14b9f5]
  - stylehacks@7.0.1

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

### Patch Changes

- Updated dependencies [0d10597]
  - stylehacks@7.0.0

## 6.0.5

### Patch Changes

- Updated dependencies [0856f86]
  - stylehacks@6.1.1

## 6.0.4

### Patch Changes

- enable “go to definition” via declaration maps
- Updated dependencies
  - stylehacks@6.1.0

## 6.0.3

### Patch Changes

- Updated dependencies [83d3268]
  - stylehacks@6.0.3

## 6.0.2

### Patch Changes

- Updated dependencies [f233b22]
- Updated dependencies [26bbbd3]
- Updated dependencies [26bbbd3]
- Updated dependencies [1ead72d]
  - stylehacks@6.0.2

## 6.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- Updated dependencies [18331a6]
  - stylehacks@6.0.1

## 6.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

### Patch Changes

- Updated dependencies [ca9d3f55]
  - stylehacks@6.0.0

## 5.1.7

### Patch Changes

- Updated dependencies
  - stylehacks@5.1.1

## 5.1.6

### Patch Changes

- fix: preserve hyphenated property case

## 5.1.5

### Patch Changes

- fix: preserve more color function fallbacks

## 5.1.4

### Patch Changes

- fix: update postcss-merge-longhand. It was skipped by mistake in the previous release.

## 5.1.3

### Patch Changes

- fix: correct package.json dependency version specifier

## 5.1.2

### Patch Changes

- fix: preserve custom property case

## 5.1.1

### Patch Changes

- fix: do not merge declarations containing custom properties when it might create invalid declarations

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

### Patch Changes

- Updated dependencies
  - stylehacks@5.1.0

## 5.0.6

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - stylehacks@5.0.3

## 5.0.5

### Patch Changes

- refactor: remove implicit boolean conversion
- refactor: replace array with set
- Updated dependencies
  - stylehacks@5.0.2

# 5.0.4

### Chore

- 07172825ffbb4f4: **postcss-merge-longhand**: drop css-color-names dependency

# [5.0.3]

### Bug fixes

- **postcss-merge-longhand:** prevent crash in some situations ([#1222](https://github.com/cssnano/cssnano/pull/1222)) ([83009a](https://github.com/cssnano/cssnano/commit/83009a04e7200c80d4dfc478881eb1b231d2548f))

## [5.0.2](https://github.com/cssnano/cssnano/compare/postcss-merge-longhand@5.0.0...postcss-merge-longhand@5.0.2) (2021-05-19)

### Bug Fixes

- **postcss-merge-longhand:** mergeLonghand should not apply to CSS variables ([#1057](https://github.com/cssnano/cssnano/issues/1057)) ([8aa64c7](https://github.com/cssnano/cssnano/commit/8aa64c714f615db747605f6d79fcc043e9ee8e57)), closes [#1051](https://github.com/cssnano/cssnano/issues/1051)

## [5.0.1](https://github.com/cssnano/cssnano/compare/postcss-merge-longhand@5.0.0...postcss-merge-longhand@5.0.1) (2021-04-26)

### Bug Fixes

- **postcss-merge-longhand:** mergeLonghand should not apply to CSS variables ([#1057](https://github.com/cssnano/cssnano/issues/1057)) ([8aa64c7](https://github.com/cssnano/cssnano/commit/8aa64c714f615db747605f6d79fcc043e9ee8e57)), closes [#1051](https://github.com/cssnano/cssnano/issues/1051)

# [5.0.0](https://github.com/cssnano/cssnano/compare/postcss-merge-longhand@5.0.0-rc.2...postcss-merge-longhand@5.0.0) (2021-04-06)

**Note:** Version bump only for package postcss-merge-longhand

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/postcss-merge-longhand@5.0.0-rc.1...postcss-merge-longhand@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package postcss-merge-longhand

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/postcss-merge-longhand@5.0.0-rc.0...postcss-merge-longhand@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package postcss-merge-longhand

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-merge-longhand:** guard against missing border-width props ([#744](https://github.com/cssnano/cssnano/issues/744)) ([f050fdf](https://github.com/cssnano/cssnano/commit/f050fdfaa4b1edac65a45764eade2326d01f87cc))
- **postcss-merge-longhand:** resolve crash on empty declarations ([#770](https://github.com/cssnano/cssnano/issues/770)) ([3652430](https://github.com/cssnano/cssnano/commit/365243025f3efaefd11f264f7223f6048899fd50))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

### Bug Fixes

- **postcss-merge-longhand:** better handle uppercase properties and values ([#703](https://github.com/cssnano/cssnano/issues/703)) ([ceb24a1](https://github.com/cssnano/cssnano/commit/ceb24a1bf3fde0bf39dced9fa05155cdd7cf6964))
- bug in merging border properties with custom properties ([#653](https://github.com/cssnano/cssnano/issues/653)) ([4bb8d5e](https://github.com/cssnano/cssnano/commit/4bb8d5ec7f4c8f4007d76a23b2efdfb713f58558))
- preserve case of css custom variables. Fixes [#648](https://github.com/cssnano/cssnano/issues/648) ([#649](https://github.com/cssnano/cssnano/issues/649)) ([9aa2731](https://github.com/cssnano/cssnano/commit/9aa273173bde6e6aca76cbd0eed4b486d7edfd4d))

## 4.1.7 (2018-10-22)

## 4.1.6 (2018-10-22)

### Bug Fixes

- doesn't throw error when merge a border property ([#639](https://github.com/cssnano/cssnano/issues/639)) ([#641](https://github.com/cssnano/cssnano/issues/641)) ([d181d30](https://github.com/cssnano/cssnano/commit/d181d30c560386f406de3c9322855b32e88848b4))

## 4.1.5 (2018-10-17)

### Bug Fixes

- do not merge properties with unset ([#633](https://github.com/cssnano/cssnano/issues/633)) ([857075c](https://github.com/cssnano/cssnano/commit/857075c27d1bbdb24079e201b3d95b2ccec5f6cf))
- separate custom props to their longhand representation and merge concrete values ([#621](https://github.com/cssnano/cssnano/issues/621)) ([1ebc319](https://github.com/cssnano/cssnano/commit/1ebc3192629adbcb0e513452b4a9c1035730081e))

## 4.1.1 (2018-09-24)

# 4.1.0 (2018-08-24)

### Bug Fixes

- **postcss-merge-longhand:** Should not mangle borders ([#579](https://github.com/cssnano/cssnano/issues/579)) ([#583](https://github.com/cssnano/cssnano/issues/583)) ([4d3b3f8](https://github.com/cssnano/cssnano/commit/4d3b3f8fa5a389329989b13f85f3523e56c81435))

## 4.0.5 (2018-07-30)

### Bug Fixes

- border minification throwing error ([#570](https://github.com/cssnano/cssnano/issues/570)) ([#571](https://github.com/cssnano/cssnano/issues/571)) ([c8f151f](https://github.com/cssnano/cssnano/commit/c8f151f5f9d13e0158fdada5e6c4d375a4a17c4b))

## 4.0.4 (2018-07-25)

### Bug Fixes

- don't drop border-width with custom property from border shorthand ([#562](https://github.com/cssnano/cssnano/issues/562)) ([24a4bb0](https://github.com/cssnano/cssnano/commit/24a4bb0d687691f611843d1bc5e86e43d0412f1e))
- not convert currentColor ([#559](https://github.com/cssnano/cssnano/issues/559)) ([#560](https://github.com/cssnano/cssnano/issues/560)) ([81f488d](https://github.com/cssnano/cssnano/commit/81f488d97f57d08c60ab185c7f8c9fdc0c19227d))
- not merge border properties if there is a shorthand property between them ([#557](https://github.com/cssnano/cssnano/issues/557)) ([#558](https://github.com/cssnano/cssnano/issues/558)) ([28d89b0](https://github.com/cssnano/cssnano/commit/28d89b011f3a4671a77dfa93b563cc33af4206c9))

## 4.0.3 (2018-07-18)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

# Change Log

## 5.2.13

### Patch Changes

- fix: update autoprefixer and browserslist
- fix(postcss-reduce-initial): improve initial properties data
- Updated dependencies
  - postcss-convert-values@5.1.3
  - postcss-merge-rules@5.1.3
  - postcss-minify-params@5.1.4
  - postcss-normalize-unicode@5.1.1
  - postcss-reduce-initial@5.1.1
  - postcss-merge-longhand@5.1.7

## 5.2.12

### Patch Changes

- fix: preserve hyphenated property case
- fix: ensure sorting properties does not break the output
- fix: recognize 'constant' as a function
- Updated dependencies
  - postcss-merge-longhand@5.1.6
  - postcss-normalize-positions@5.1.1
  - postcss-normalize-repeat-style@5.1.1
  - postcss-ordered-values@5.1.3

## 5.2.11

### Patch Changes

- fix: preserve constant values
- Updated dependencies
  - postcss-ordered-values@5.1.2

## 5.2.10

### Patch Changes

- chore: update TypeScript and improve types
- fix: preserve similar nested selectors
- Updated dependencies
  - postcss-convert-values@5.1.2
  - postcss-discard-comments@5.1.2
  - postcss-merge-rules@5.1.2
  - postcss-minify-selectors@5.2.1

## 5.2.9

### Patch Changes

- fix: preserve more color function fallbacks
- Updated dependencies
  - postcss-merge-longhand@5.1.5

## 5.2.8

### Patch Changes

- postcss-convert-values: preserve percentage sign on IE 11
- postcss-minify-params: refactor
- Updated dependencies
  - postcss-convert-values@5.1.1
  - postcss-minify-params@5.1.3

## 5.2.7

### Patch Changes

- fix: update postcss-merge-longhand. It was skipped by mistake in the previous release.
- Updated dependencies
  - postcss-merge-longhand@5.1.4

## 5.2.6

### Patch Changes

- fix: preserve border color when merging border properties

## 5.2.5

### Patch Changes

- fix: correct package.json dependency version specifier
- Updated dependencies
  - postcss-merge-longhand@5.1.3
  - postcss-merge-rules@5.1.1
  - postcss-minify-gradients@5.1.1
  - postcss-minify-params@5.1.2
  - postcss-ordered-values@5.1.1

## 5.2.4

### Patch Changes

- fix: preserve custom property case
- Updated dependencies
  - postcss-merge-longhand@5.1.2

## 5.2.3

### Patch Changes

- fix: do not merge declarations containing custom properties when it might create invalid declarations
- Updated dependencies
  - postcss-merge-longhand@5.1.1

## 5.2.2

### Patch Changes

- fix: preserve empty custom properties and ensure they work in Chrome
- Updated dependencies
  - postcss-discard-empty@5.1.1
  - postcss-minify-params@5.1.1
  - postcss-normalize-whitespace@5.1.1

## 5.2.1

### Patch Changes

- fix: remove comments with PostCSS 8.4.6 and greater
- Updated dependencies
  - postcss-discard-comments@5.1.1
  - postcss-unique-selectors@5.1.1

## 5.2.0

### Minor Changes

- feature: add TypeScript type declarations

### Patch Changes

- Updated dependencies
  - cssnano-utils@3.1.0
  - postcss-colormin@5.3.0
  - postcss-convert-values@5.1.0
  - postcss-discard-comments@5.1.0
  - postcss-discard-duplicates@5.1.0
  - postcss-discard-empty@5.1.0
  - postcss-discard-overridden@5.1.0
  - postcss-merge-longhand@5.1.0
  - postcss-merge-rules@5.1.0
  - postcss-minify-font-values@5.1.0
  - postcss-minify-gradients@5.1.0
  - postcss-minify-params@5.1.0
  - postcss-minify-selectors@5.2.0
  - postcss-normalize-charset@5.1.0
  - postcss-normalize-display-values@5.1.0
  - postcss-normalize-positions@5.1.0
  - postcss-normalize-repeat-style@5.1.0
  - postcss-normalize-string@5.1.0
  - postcss-normalize-timing-functions@5.1.0
  - postcss-normalize-unicode@5.1.0
  - postcss-normalize-url@5.1.0
  - postcss-normalize-whitespace@5.1.0
  - postcss-ordered-values@5.1.0
  - postcss-reduce-initial@5.1.0
  - postcss-reduce-transforms@5.1.0
  - postcss-svgo@5.1.0
  - postcss-unique-selectors@5.1.0

## 5.1.12

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - cssnano-utils@3.0.2
  - postcss-colormin@5.2.5
  - postcss-convert-values@5.0.4
  - postcss-discard-comments@5.0.3
  - postcss-discard-duplicates@5.0.3
  - postcss-discard-empty@5.0.3
  - postcss-discard-overridden@5.0.4
  - postcss-merge-longhand@5.0.6
  - postcss-merge-rules@5.0.6
  - postcss-minify-font-values@5.0.4
  - postcss-minify-gradients@5.0.6
  - postcss-minify-params@5.0.5
  - postcss-minify-selectors@5.1.3
  - postcss-normalize-charset@5.0.3
  - postcss-normalize-display-values@5.0.3
  - postcss-normalize-positions@5.0.4
  - postcss-normalize-repeat-style@5.0.4
  - postcss-normalize-string@5.0.4
  - postcss-normalize-timing-functions@5.0.3
  - postcss-normalize-unicode@5.0.4
  - postcss-normalize-url@5.0.5
  - postcss-normalize-whitespace@5.0.4
  - postcss-ordered-values@5.0.5
  - postcss-reduce-initial@5.0.3
  - postcss-reduce-transforms@5.0.4
  - postcss-svgo@5.0.4
  - postcss-unique-selectors@5.0.4

## 5.1.11

### Patch Changes

- refactor: replace natural sort with built-in array sort
- Updated dependencies
  - cssnano-utils@3.0.1
  - postcss-minify-font-values@5.0.3
  - postcss-minify-params@5.0.4
  - postcss-normalize-charset@5.0.2
  - postcss-discard-duplicates@5.0.2
  - postcss-colormin@5.2.4
  - postcss-convert-values@5.0.3
  - postcss-discard-empty@5.0.2
  - postcss-discard-overridden@5.0.3
  - postcss-merge-longhand@5.0.5
  - postcss-merge-rules@5.0.5
  - postcss-minify-selectors@5.1.2
  - postcss-normalize-positions@5.0.3
  - postcss-normalize-unicode@5.0.3
  - postcss-normalize-whitespace@5.0.3
  - postcss-ordered-values@5.0.4
  - postcss-normalize-string@5.0.3
  - postcss-reduce-transforms@5.0.3
  - postcss-minify-gradients@5.0.5
  - postcss-normalize-repeat-style@5.0.3
  - postcss-unique-selectors@5.0.3
  - postcss-discard-comments@5.0.2

## 5.1.10 (2022-01-07)

### Patch Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

- fix: update postcss-calc to 8.2

  Remove a crash when postcss-calc cannot parse the value

- Updated dependencies
  - cssnano-utils@3.0.0
  - postcss-colormin@5.2.3
  - postcss-discard-overridden@5.0.2
  - postcss-merge-rules@5.0.4
  - postcss-minify-font-values@5.0.2
  - postcss-minify-gradients@5.0.4
  - postcss-minify-params@5.0.3
  - postcss-minify-selectors@5.1.1
  - postcss-normalize-display-values@5.0.2
  - postcss-normalize-positions@5.0.2
  - postcss-normalize-repeat-style@5.0.2
  - postcss-normalize-string@5.0.2
  - postcss-normalize-timing-functions@5.0.2
  - postcss-normalize-unicode@5.0.2
  - postcss-normalize-whitespace@5.0.2
  - postcss-ordered-values@5.0.3
  - postcss-reduce-transforms@5.0.2

## 5.1.9 (2021-12-16)

### Patch Changes

- chore(postcss-normalize-url): reduce dependencies ([#1255](https://github.com/cssnano/cssnano/pull/1255)) ([a4267dedcd6](https://github.com/cssnano/cssnano/commit/a4267dedcd6d41ece45a0dfc5a73ea4b9e4ae028))
- fix(postcss-colormin): accept configuration options ([#1263](https://github.com/cssnano/cssnano/pull/1263))([3b38038007](https://github.com/cssnano/cssnano/commit/3b38038007bfd8761d84a9e35f0191b56e5b50d7))
- Updated dependencies
  - postcss-normalize-url@5.0.4
  - postcss-colormin@5.2.2

## 5.1.8 (2021-11-27)

### Bug fixes

- fix(postcss-reduce-initial): update initial values data ([#1242](https://github.com/cssnano/cssnano/pull/1242)) ([c6e9f00b785](https://github.com/cssnano/cssnano/commit/c6e9f00b785d85df0d92a110ec95a14fd98adcc9))
- Updated dependencies
  - postcss-reduce-initial@5.0.2

# 5.1.7 (2021-11-16)

### Bug fixes

- c38f14c3ce3d0b: **postcss-normalize-url**: avoid changing parameter encoding

### Chore

- 31d5c07dc07a4: refactor: drop one-liner dependencies
- 07172825ffbb4f4: **postcss-merge-longhand**: drop css-color-names dependency

# 5.1.6 (2021-11-05)

### Bug fixes

- **postcss-merge-longhand:** prevent crash in some situations ([#1222](https://github.com/cssnano/cssnano/pull/1222)) ([83009a](https://github.com/cssnano/cssnano/commit/83009a04e7200c80d4dfc478881eb1b231d2548f))

# 5.1.5 (2021-11-01)

### Bug fixes

- **postcss-svgo:** normalize SVG with escaped quote characters ([#1200](https://github.com/cssnano/cssnano/pull/1200)) ([4ef5e41](https://github.com/cssnano/cssnano/commit/4ef5e41a6c61a23094001da82a76321ca746b22f))

- **postcss-convert-values:** preserve percentage-only properties ([#1212](https://github.com/cssnano/cssnano/pull/1212)) ([8f3453](https://github.com/cssnano/cssnano/commit/8f345385b210cf85e9d591382d387f76ca4b0f64))

- **postcss-minify-gradients:** handle 2 color-stop-length in linear gradient ([#1215](https://github.com/cssnano/cssnano/pull/1215)) ([8bb7ba6c](https://github.com/cssnano/cssnano/commit/8bb7ba6c1733fd12122589169d847b1a1212a6b5))

### Chore

- **postcss-colormin:** use colord plugin for color minification ([#1207](https://github.com/cssnano/cssnano/pull/1207)) ([3dbaa04](https://github.com/cssnano/cssnano/commit/3dbaa04addfa2f18375262377e172b03819dc2c0))

# 5.1.4 (2021-08-18)

## Chore

- **postcss-minify-gradients:** remove extra dependencies ([#1181](https://github.com/cssnano/cssnano/pull/1181)) ([50eb53](https://github.com/cssnano/cssnano/commit/50eb53e63b6eaae598ae4e51d02255ec8dcc9c8f))

# 5.1.3 (2021-06-09)

### Bug Fixes

**postcss-normalize-url**: bump normalize-url dependency to 6.0.1 (#1142)
([b60f54bed](https://github.com/cssnano/cssnano/commit/b60f54bedafe3781ff58f0888ab45ff5c56aee09))

**postcss-ordered-values**: preserve columns count (#1144)
([9acd6a2fe3e](https://github.com/cssnano/cssnano/commit/9acd6a2fe3e188a5f29fef91cf406495fa74a877))

# 5.1.1 (2021-05-21)

### Bug Fixes

- **postcss-colormin:** Strict color parsing ([#1122](https://github.com/cssnano/cssnano/issues/1122)) ([32771da](https://github.com/cssnano/cssnano/commit/32771da46ee94f07a6907ec47701189f90ad2ec0))
- **postcss-colormin:** fix ERR_PACKAGE_PATH_NOT_EXPORTED ([#1110](https://github.com/cssnano/cssnano/issues/1110)) ([8a31ca38796](https://github.com/cssnano/cssnano/commit/8a31ca38796e12e6fe52620cf8a545cb058fe295))

# [5.1.0](https://github.com/cssnano/cssnano/compare/cssnano-preset-default@5.0.0...cssnano-preset-default@5.1.0) (2021-05-19)

### Bug Fixes

- **postcss-merge-rules:** add some missing known pseudo classes. ([#1099](https://github.com/cssnano/cssnano/issues/1099)) ([4d7fe36](https://github.com/cssnano/cssnano/commit/4d7fe367bebab86c7b5664ed4621ee7586ca7d86))
- **postcss-merge-rules:** prevent breaking rule merges ([#1072](https://github.com/cssnano/cssnano/issues/1072)) ([c5e0a5e](https://github.com/cssnano/cssnano/commit/c5e0a5eac171089ae994fcba21d9c565fb462577)), closes [#999](https://github.com/cssnano/cssnano/issues/999)

### Features

- **postcss-colormin:** switch to colord and solve multiple issues ([#1107](https://github.com/cssnano/cssnano/issues/1107)) ([a7f0be4](https://github.com/cssnano/cssnano/commit/a7f0be4acc640aab89cace53a720b3d59b6f7b4f)), closes [#819](https://github.com/cssnano/cssnano/issues/819) [#1042](https://github.com/cssnano/cssnano/issues/1042) [#819](https://github.com/cssnano/cssnano/issues/819) [#771](https://github.com/cssnano/cssnano/issues/771)

## [5.0.1](https://github.com/cssnano/cssnano/compare/cssnano-preset-default@5.0.0...cssnano-preset-default@5.0.1) (2021-04-26)

**Note:** Version bump only for package cssnano-preset-default

# [5.0.0](https://github.com/cssnano/cssnano/compare/cssnano-preset-default@5.0.0-rc.2...cssnano-preset-default@5.0.0) (2021-04-06)

**Note:** Version bump only for package cssnano-preset-default

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/cssnano-preset-default@5.0.0-rc.1...cssnano-preset-default@5.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package cssnano-preset-default

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/cssnano-preset-default@5.0.0-rc.0...cssnano-preset-default@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package cssnano-preset-default

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-convert-values:** prevent zero units from being dropped in line-height. ([#801](https://github.com/cssnano/cssnano/issues/801)) ([d781855](https://github.com/cssnano/cssnano/commit/d78185567ae5ebcde0469cf0e55145a7a3130d3e))
- **postcss-merge-rules:** don't change specificity of prefixed properties ([#723](https://github.com/cssnano/cssnano/issues/723)) ([863cf2b](https://github.com/cssnano/cssnano/commit/863cf2b3470d3172523a3165dc368abcfa18809c))
- **postcss-normalize-positions:** correct optimize math (`calc` and etc) and variable functions (`var` and `env`) ([#750](https://github.com/cssnano/cssnano/issues/750)) ([a81e8df](https://github.com/cssnano/cssnano/commit/a81e8dfc1ad26067d5a9efab8081072cd4b15c44))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- css declaration sorter ([#855](https://github.com/cssnano/cssnano/issues/855)) ([613d562](https://github.com/cssnano/cssnano/commit/613d562ae79e7e169c80b523b7c2c9b0093bc1d8))
- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))
- **postcss-merge-rules:** merge at-rules ([#722](https://github.com/cssnano/cssnano/issues/722)) ([8d4610a](https://github.com/cssnano/cssnano/commit/8d4610a6391ddab29bcb08ef0522d0b7ce2d6582))
- **postcss-ordered-values:** compress more vendor properties ([#746](https://github.com/cssnano/cssnano/issues/746)) ([b479440](https://github.com/cssnano/cssnano/commit/b4794404bffa54558654b215eb550e6adb98e144))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.9 (2019-02-12)

## 4.1.7 (2018-10-22)

## 4.1.6 (2018-10-22)

## 4.1.5 (2018-10-17)

## 4.1.4 (2018-09-27)

## 4.1.2 (2018-09-25)

## 4.1.1 (2018-09-24)

### Bug Fixes

- parse error with iPhone X feature ([#614](https://github.com/cssnano/cssnano/issues/614)) ([a3704a7](https://github.com/cssnano/cssnano/commit/a3704a76a631b1cd907ab0c0a8637a622769676d))
- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)
- **postcss-merge-longhand:** Should not mangle borders ([#579](https://github.com/cssnano/cssnano/issues/579)) ([#583](https://github.com/cssnano/cssnano/issues/583)) ([4d3b3f8](https://github.com/cssnano/cssnano/commit/4d3b3f8fa5a389329989b13f85f3523e56c81435))

### Features

- **postcss-ordered-values:** support ordering animation values ([#574](https://github.com/cssnano/cssnano/issues/574)) ([17ec039](https://github.com/cssnano/cssnano/commit/17ec039dfbe7f596df12f5d5889bf3e6cd32afd6))

# Change Log

## 7.1.0

### Minor Changes

- Update to SVGO 4.0
- Update browserslist

## 7.0.7

### Patch Changes

- 2f03871: fix: update lilconfig and browserslist
- perf: load default preset on startup
- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities
- Updated dependencies [2f03871]
- Updated dependencies [171b669]
- Updated dependencies [20f4eb6]
- Updated dependencies [5672148]
  - cssnano-preset-default@7.0.7

## 7.0.6

### Patch Changes

- Updated dependencies [024ddef]
- Updated dependencies [1d65a10]
  - cssnano-preset-default@7.0.6

## 7.0.5

### Patch Changes

- f14a898: chore: update all dependencies
- Updated dependencies [dff5c42]
- Updated dependencies [f14a898]
  - cssnano-preset-default@7.0.5

## 7.0.4

### Patch Changes

- cssnano-preset-default@7.0.4

## 7.0.3

### Patch Changes

- Updated dependencies [0c85fa9]
- Updated dependencies [13fb841]
- Updated dependencies [08989b0]
  - cssnano-preset-default@7.0.3

## 7.0.2

### Patch Changes

- cssnano-preset-default@7.0.2

## 7.0.1

### Patch Changes

- Updated dependencies [2a26e29]
  - cssnano-preset-default@7.0.1

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

### Patch Changes

- Updated dependencies [0d10597]
  - cssnano-preset-default@7.0.0

## 6.1.2

### Patch Changes

- fix(cssnano-preset-default): update css-declaration-sorter
- 2f3fb50: chore: update autoprefixer
- Updated dependencies
  - cssnano-preset-default@6.1.2

## 6.1.1

### Patch Changes

- cssnano-preset-default@6.1.1

## 6.1.0

### Minor Changes

- feat: add preset and plugin options for browserslist

### Patch Changes

- fix(cssnano): prevent crash when first preset is already invoked
- enable “go to definition” via declaration maps
- fix: add missing type declarations to plugins with options
- Updated dependencies
  - cssnano-preset-default@6.1.0

## 6.0.5

### Patch Changes

- 83d3268: chore: update autoprefixer and browerslist
  - cssnano-preset-default@6.0.5

## 6.0.4

### Patch Changes

- 311eaee: fix(cssnano): set minimum lilconfig version to one without vulnerabilities
  - cssnano-preset-default@6.0.4

## 6.0.3

### Patch Changes

- 26bbbd3: chore: update minimum browserslist version to 4.22.2
- 26bbbd3: chore: update postcss-selector-parser to 6.0.13
- Updated dependencies [9c6b0bc]
  - cssnano-preset-default@6.0.3

## 6.0.2

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- 18331a6: fix: update postcss-calc to 9.0.1 to solve disappearing expressions inside two brackets
- 18331a6: deps(postcss-svgo): update SVGO to 3.0.5 and update doc
- 18331a6: chore: update css-declaration-sorter
- 18331a6: fix(postcss-minify-selectors): prevent mangling of timeline range names
- 18331a6: fix(postcss-convert-values): keep percent unit in @Property
- 18331a6: chore(cssnano): update lilconfig to 3.0.0
- Updated dependencies [18331a6]
  - cssnano-preset-default@6.0.2

## 6.0.1

### Patch Changes

- chore: updage postcss-calc to version 9
- fix(postcss-merge-rules): do not merge nested rules
- Updated dependencies
  - cssnano-preset-default@6.0.1

## 6.0.0

### Major Changes

- 39a20405: feat!(cssnano): remove yaml config support
- ca9d3f55: Switch minimum supported Node version to 14 for all packages

### Patch Changes

- Updated dependencies [ca9d3f55]
- Updated dependencies [ca9d3f55]
  - cssnano-preset-default@6.0.0

## 5.1.15

### Patch Changes

- fix(postcsss-reduce-initial): fix mask-repeat conversion
  fix(postcss-colormin): don't minify colors in src declarations
  fix(postcss-merge-rules): do not merge conflicting flex and border properties
- Updated dependencies
  - cssnano-preset-default@5.2.14

## 5.1.14

### Patch Changes

- fix: update autoprefixer and browserslist
- fix(postcss-reduce-initial): improve initial properties data
- Updated dependencies
  - cssnano-preset-default@5.2.13

## 5.1.13

### Patch Changes

- fix(cssnano): correct return type of cssnano() call

## 5.1.12

### Patch Changes

- fix: preserve hyphenated property case
- fix: ensure sorting properties does not break the output
- fix: recognize 'constant' as a function
- Updated dependencies
  - cssnano-preset-default@5.2.12

## 5.1.11

### Patch Changes

- fix: preserve constant values
- Updated dependencies
  - cssnano-preset-default@5.2.11

## 5.1.10

### Patch Changes

- chore: update TypeScript and improve types
- fix: preserve similar nested selectors
- Updated dependencies
  - cssnano-preset-default@5.2.10

## 5.1.9

### Patch Changes

- fix: preserve more color function fallbacks
- Updated dependencies
  - cssnano-preset-default@5.2.9

## 5.1.8

### Patch Changes

- postcss-convert-values: preserve percentage sign on IE 11
- postcss-minify-params: refactor
- Updated dependencies
  - cssnano-preset-default@5.2.8

## 5.1.7

### Patch Changes

- fix: update postcss-merge-longhand. It was skipped by mistake in the previous release.
- Updated dependencies
  - cssnano-preset-default@5.2.7

## 5.1.6

### Patch Changes

- fix: preserve border color when merging border properties
- Updated dependencies
  - cssnano-preset-default@5.2.6

## 5.1.5

### Patch Changes

- fix: correct package.json dependency version specifier
- Updated dependencies
  - cssnano-preset-default@5.2.5

## 5.1.4

### Patch Changes

- fix: preserve custom property case
- Updated dependencies
  - cssnano-preset-default@5.2.4

## 5.1.3

### Patch Changes

- fix: do not merge declarations containing custom properties when it might create invalid declarations
- Updated dependencies
  - cssnano-preset-default@5.2.3

## 5.1.2

### Patch Changes

- fix: preserve empty custom properties and ensure they work in Chrome
- Updated dependencies
  - cssnano-preset-default@5.2.2

## 5.1.1

### Patch Changes

- fix: remove comments with PostCSS 8.4.6 and greater
- Updated dependencies
  - cssnano-preset-default@5.2.1

## 5.1.0

### Minor Changes

- feature: add TypeScript type declarations

### Patch Changes

- Updated dependencies
  - cssnano-preset-default@5.2.0

## 5.0.17

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - cssnano-preset-default@5.1.12

## 5.0.16

### Patch Changes

- refactor: replace natural sort with built-in array sort
- Updated dependencies
  - cssnano-preset-default@5.1.11

## 5.0.15

### Patch Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

- fix: update postcss-calc to 8.2

  Remove a crash when postcss-calc cannot parse the value

- Updated dependencies
  - cssnano-preset-default@5.1.10

## 5.0.14 (2021-12-20)

### Bug fixes

- fix(cssnano): correctly resolve presets in pnpm monorepo ([#1269](https://github.com/cssnano/cssnano/pull/1269)) ([6f9c7477eb](https://github.com/cssnano/cssnano/commit/6f9c7477eb3eb191d3a7454071908a17dac90fa3))

## 5.0.13 (2021-12-16)

### Patch Changes

- chore(postcss-normalize-url): reduce dependencies ([#1255](https://github.com/cssnano/cssnano/pull/1255))([a4267dedcd6](https://github.com/cssnano/cssnano/commit/a4267dedcd6d41ece45a0dfc5a73ea4b9e4ae028))
- fix(postcss-colormin): accept configuration options ([#1263](https://github.com/cssnano/cssnano/pull/1263))([3b38038007](https://github.com/cssnano/cssnano/commit/3b38038007bfd8761d84a9e35f0191b56e5b50d7))
- Updated dependencies
  - cssnano-preset-default@5.1.9

## 5.0.12 (2021-11-27)

### Bug fixes

- fix(postcss-reduce-initial): update initial values data ([#1242](https://github.com/cssnano/cssnano/pull/1242)) ([c6e9f00b785](https://github.com/cssnano/cssnano/commit/c6e9f00b785d85df0d92a110ec95a14fd98adcc9))
- Updated dependencies
  - cssnano-preset-default@5.1.8

# 5.0.11 (2021-11-16)

### Bug fixes

- c38f14c3ce3d0: **postcss-normalize-url**: avoid changing parameter encoding

### Chore

- 31d5c07dc07a4: refactor: drop one-liner dependencies
- 07172825ffbb4f4: **postcss-merge-longhand**: drop css-color-names dependency

# 5.0.10 (2021-11-05)

### Bug fixes

- **postcss-merge-longhand:** prevent crash in some situations ([#1222](https://github.com/cssnano/cssnano/pull/1222)) ([83009a](https://github.com/cssnano/cssnano/commit/83009a04e7200c80d4dfc478881eb1b231d2548f))

# 5.0.9 (2021-11-01)

### Bug fixes

- **postcss-svgo:** normalize SVG with escaped quote characters ([#1200](https://github.com/cssnano/cssnano/pull/1200)) ([4ef5e41](https://github.com/cssnano/cssnano/commit/4ef5e41a6c61a23094001da82a76321ca746b22f))

- **postcss-convert-values:** preserve percentage-only properties ([#1212](https://github.com/cssnano/cssnano/pull/1212)) ([8f3453](https://github.com/cssnano/cssnano/commit/8f345385b210cf85e9d591382d387f76ca4b0f64))

- **postcss-minify-gradients:** handle 2 color-stop-length in linear gradient ([#1215](https://github.com/cssnano/cssnano/pull/1215)) ([8bb7ba6c](https://github.com/cssnano/cssnano/commit/8bb7ba6c1733fd12122589169d847b1a1212a6b5))

- **cssnano-preset-advanced:** update autoprefixer ([#1213](https://github.com/cssnano/cssnano/pull/1213)) ([f19932](https://github.com/cssnano/cssnano/commit/f199323a8368546d9632112d381419930106e384))

### Chore

- **postcss-colormin:** use colord plugin for color minification ([#1207](https://github.com/cssnano/cssnano/pull/1207)) ([3dbaa04](https://github.com/cssnano/cssnano/commit/3dbaa04addfa2f18375262377e172b03819dc2c0))

# 5.0.8 (2021-08-18)

## Chore

- **postcss-minify-gradients:** remove extra dependencies ([#1181](https://github.com/cssnano/cssnano/pull/1181)) ([50eb53](https://github.com/cssnano/cssnano/commit/50eb53e63b6eaae598ae4e51d02255ec8dcc9c8f))

# 5.0.7 (2021-07-21)

### Bug fixes

- **cssnano**: reduce dependencies by moving from cosmiconfig to lilconfig (#1168)
  ([506a8232](https://github.com/cssnano/cssnano/commit/506a823284191a41752939276f50dbdf75cc8e79))

# 5.0.6 (2021-06-09)

### Bug Fixes

**postcss-normalize-url**: bump normalize-url dependency to 6.0.1 (#1142)
([b60f54bed](https://github.com/cssnano/cssnano/commit/b60f54bedafe3781ff58f0888ab45ff5c56aee09))

**postcss-ordered-values**: preserve columns count (#1144)
([9acd6a2fe3e](https://github.com/cssnano/cssnano/commit/9acd6a2fe3e188a5f29fef91cf406495fa74a877))

# 5.0.5 (2021-05-28)

### Bug fixes

- Preserve alpha channel in color minification
- Check overlaps more exhaustively when merging rules
- Do not crash when the input CSS contains relative URLs

# 5.0.4 (2021-05-21)

### Bug Fixes

- **postcss-colormin:** Strict color parsing ([#1122](https://github.com/cssnano/cssnano/issues/1122)) ([32771da](https://github.com/cssnano/cssnano/commit/32771da46ee94f07a6907ec47701189f90ad2ec0))
- **postcss-colormin:** fix ERR_PACKAGE_PATH_NOT_EXPORTED ([#1110](https://github.com/cssnano/cssnano/issues/1110)) ([8a31ca38796](https://github.com/cssnano/cssnano/commit/8a31ca38796e12e6fe52620cf8a545cb058fe295))

## [5.0.3](https://github.com/cssnano/cssnano/compare/cssnano@5.0.0...cssnano@5.0.3) (2021-05-19)

### Bug Fixes

- **cssnano:** many bug fixes in dependent packages. Most notably fixed buggy reordering of border declarations and improved color value minification. See the changelogs for the single presets and plugins for details.

## [5.0.2](https://github.com/cssnano/cssnano/compare/cssnano@5.0.0...cssnano@5.0.2) (2021-04-26)

### Bug Fixes

- **cssnano:** replace opencollective with funding field. ([#1047](https://github.com/cssnano/cssnano/issues/1047)) ([3dee7c5](https://github.com/cssnano/cssnano/commit/3dee7c553350e43ad0750a9478a63cf897e5510f)), closes [#1046](https://github.com/cssnano/cssnano/issues/1046)

## [5.0.1](https://github.com/cssnano/cssnano/compare/cssnano@5.0.0...cssnano@5.0.1) (2021-04-13)

### Bug Fixes

- **cssnano:** replace opencollective with funding field. ([#1047](https://github.com/cssnano/cssnano/issues/1047)) ([3dee7c5](https://github.com/cssnano/cssnano/commit/3dee7c553350e43ad0750a9478a63cf897e5510f)), closes [#1046](https://github.com/cssnano/cssnano/issues/1046)

# [5.0.0](https://github.com/cssnano/cssnano/compare/cssnano@5.0.0-rc.2...cssnano@5.0.0) (2021-04-06)

**Note:** Version bump only for package cssnano

# [5.0.0-rc.2](https://github.com/cssnano/cssnano/compare/cssnano@5.0.0-rc.1...cssnano@5.0.0-rc.2) (2021-03-15)

### Bug Fixes

- update SVGO ([aa07cfd](https://github.com/cssnano/cssnano/commit/aa07cfd62c82ed4b1e87219eea8d0ed99635e4ca))

# [5.0.0-rc.1](https://github.com/cssnano/cssnano/compare/cssnano@5.0.0-rc.0...cssnano@5.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package cssnano

# 5.0.0-rc.0 (2021-02-19)

### Bug Fixes

- **postcss-ordered-values:** columns transform returning string instead of the AST ([#928](https://github.com/cssnano/cssnano/issues/928)) ([a5d6d36](https://github.com/cssnano/cssnano/commit/a5d6d364e0815ecb198a95de301f3554ccce4f78))
- **unique-selector:** removed sorting and involving selector comments ([#857](https://github.com/cssnano/cssnano/issues/857)) ([3fa875d](https://github.com/cssnano/cssnano/commit/3fa875dade2138e1a531dce1f8b79814cb39dbc9))

### chore

- minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))

### Features

- css declaration sorter ([#855](https://github.com/cssnano/cssnano/issues/855)) ([613d562](https://github.com/cssnano/cssnano/commit/613d562ae79e7e169c80b523b7c2c9b0093bc1d8))
- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))
- **postcss-reduce-transforms:** improve optimizations ([#745](https://github.com/cssnano/cssnano/issues/745)) ([b0f0d89](https://github.com/cssnano/cssnano/commit/b0f0d892316d7b77e8033a6dc8d67745043a5072))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`
- minimum require version of node is 10.13

## 4.1.10 (2019-02-14)

## 4.1.9 (2019-02-12)

### Bug Fixes

- initial loading time ([#654](https://github.com/cssnano/cssnano/issues/654)) ([de2ef07](https://github.com/cssnano/cssnano/commit/de2ef074a0c7da94c22a5b0336e6c4ca2a94f1b5))

## 4.1.7 (2018-10-22)

## 4.1.6 (2018-10-22)

## 4.1.5 (2018-10-17)

### Bug Fixes

- toggling of plugins in presets using boolean configuration option ([#622](https://github.com/cssnano/cssnano/issues/622)) ([15076f1](https://github.com/cssnano/cssnano/commit/15076f145118507e010722cc9ed548ffe1b91f8c))

## 4.1.4 (2018-09-27)

## 4.1.3 (2018-09-25)

## 4.1.2 (2018-09-25)

## 4.1.1 (2018-09-24)

### Bug Fixes

- parse error with iPhone X feature ([#614](https://github.com/cssnano/cssnano/issues/614)) ([a3704a7](https://github.com/cssnano/cssnano/commit/a3704a76a631b1cd907ab0c0a8637a622769676d))

# 4.1.0 (2018-08-24)

## 4.0.5 (2018-07-30)

## 4.0.4 (2018-07-25)

## 4.0.3 (2018-07-18)

### Bug Fixes

- **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)

# 4.1.10

## Bug Fixes

- `stylehacks` does not throw error on `[attr]` selector

# 4.1.9

## Performance Improvements

- `postcss-colormin`: increase performance
- `postcss-discard-comments`: increase performance
- `postcss-merge-rules` increase performance
- `postcss-minify-params` increase performance
- `postcss-minify-selectors`: increase performance
- `postcss-normalize-display-values`: increase performance
- `postcss-normalize-positions`: increase performance
- `postcss-normalize-repeat-style`: increase performance
- `postcss-normalize-string`: increase performance
- `postcss-normalize-timing-functions`: increase performance
- `postcss-normalize-whitespace`: increase performance
- `postcss-ordered-values`: increase performance
- `postcss-reduce-transforms`: increase performance
- `postcss-svgo`: increase performance

## Bug Fixes

- `postcss-merge-longhand` handle uppercase properties and values
- `postcss-minify-gradients` handle uppercase properties and values
- `postcss-minify-params` do break `@page` rules
- `postcss-reduce-idents` handle uppercase at-rules
- `postcss-reduce-initial` now uses `repeat` as initial value for `mask-repeat`
- `postcss-reduce-initial` handle uppercase value when you convert to initial
- `stylehacks` handle uppercase properties and values

# 4.1.8

## Performance Improvements

- initial loading time (`require('cssnano')`).

## Bug Fixes

- `postcss-merge-longhand` correctly merging border properties with custom properties.

# 4.1.7

## Bug Fixes

- republish `cssnano` due broken release.

# 4.1.6

## Bug Fixes

- `postcss-merge-longhand` doesn't throw error when merge a border property.

# 4.1.5

## Bug Fixes

- `cssnano` now allow to toggling of plugins in presets using boolean configuration option.
- `postcss-merge-longhand` doesn't merge properties with `unset`.
- `postcss-merge-longhand` correctly merge borders with custom properties.
- `postcss-merge-longhand` doesn't merge redundant values if declarations are of different importance.

## Other changes

- `postcss-calc` updated to `7.0.0` version.

# 4.1.4

## Other changes

- `css-declaration-sorter` now use PostCSS 7.
- `postcss-calc` now use PostCSS 7.

# 4.1.3

## Other changes

- `postcss-minify-font-values` now use PostCSS 7.
- `postcss-discard-duplicates` now use PostCSS 7.

# 4.1.2

## Bug Fixes

- `postcss-svgo` now handle DataURI with uppercase `data` value (`DATA:image/*;...`).

# 4.1.1

## Bug Fixes

- `css-declaration-sorter` was removed from default prevent.
- `postcss-normalize-timing-functions` doesn't lowercased property anymore.
- `postcss-normalize-positons` now handles uppercase properties.
- `postcss-normalize-url` now is case-insensitive.
- `postcss-merge-idents` now is case-insensitive.
- `postcss-merge-rules` now is case-insensitive.
- `postcss-minify-selectors` now is case-insensitive.
- `postcss-minify-font-values` now is case-insensitive.
- `postcss-normalize-unicode` now has correct dependencies.
- `postcss-minify-params` now has correct dependencies.

## Other changes

- `cssnano-preset-advanced` use Autoprefixer 9.
- use PostCSS 7 in all plugins.

# 4.1.0

## Bug Fixes

- `postcss-merge-longhand` doesn't mangle borders.

## Features

- `postcss-ordered-values` support ordering animation values.

# 4.0.5

## Bug Fixes

- `postcss-merge-longhand` now correctly merges borders with custom properties.
- `postcss-merge-longhand` doesn't throw error in some `border` merge cases.

# 4.0.4

## Bug Fixes

- `postcss-merge-longhand` doesn't drop border-width with custom property from border shorthand.
- `postcss-merge-longhand` doesn't convert `currentColor`.
- `postcss-merge-longhand` doesn't merge border properties if there is a shorthand property between them.

# 4.0.3

## Bug Fixes

- `postcss-merge-longhand` incorrect minification of `border` (`border-*`) declarations.

# 4.0.2

## Bug Fixes

- `postcss-merge-longhand` don't explode declarations with custom properties.
- `postcss-colormin` now better transform to `hsl`.

# 4.0.1

## Bug Fixes

- `browserslist` version incompatibility with `caniuse-api`.

# 4.0.0

## Breaking changes

- We dropped support for Node 4, now requiring at least Node 6.9.

## Features

- postcss-merge-longhand now optimises `border-spacing` property.

## Bug Fixes

- postcss-normalize-unicode doesn't change `U` to lowercase for `IE` <= 11 and `Edge` <= 15.
- postcss-merge-longhand works with custom properties (Example `a { border-style:dotted; border-style:var(--variable) }`) correctly.
- postcss-ordered-values handle `border` property with invalid border width value correctly.
- postcss-merge-rules handles `:-ms-input-placeholder` and `::-ms-input-placeholder` selectors correctly.
- postcss-merge-rules works with `all` property correctly.
- postcss-normalize-url don't handle empty `url` function.
- postcss-normalize-url handles `data` and `*-extension://` URLs correctly.
- postcss-colormin adds whitespace after minified value and before function.
- postcss-minify-font-values better escapes font name.
- postcss-minify-params doesn't remove `all` for IE.

## Other changes

- update all dependencies to latest.
- better handles uppercase selectors/properties/values/units.

# 4.0.0-rc.2

## Features

- Includes the new release candidate for postcss-selector-parser 3.
- Refactors comments tokenizing in postcss-discard-comments to be more
  memory efficient.
- Adds css-declaration-sorter for improved gzip compression efficiencies
  (thanks to @Siilwyn).
- postcss-svgo now optimises base 64 encoded SVG where possible
  (thanks to @evilebottnawi).
- stylehacks now supports `@media \0screen\,screen\9 {}` hacks
  (thanks to @evilebottnawi).

## Bug Fixes

- Fixed handling of package.json configuration (thanks to @andyjansson).
- Fixed `resolveConfig` for a `Root` node without a `source` property
  (thanks to @darthmaim).
- Improved radial gradient handling (thanks to @pigcan).
- stylehacks now properly accounts for vendor prefixes
  (thanks to @evilebottnawi).

# 4.0.0-rc.1

## Bug Fixes

- cssnano: Resolved an issue with external configuration which wasn't
  being loaded correctly (thanks to @andyjansson).
- postcss-minify-params: Resolved an issue with cssnano's handling of the
  `@value` syntax from css-modules to better integrate with css-loader.

# 4.0.0-rc.0

Since version 4 has been in-development for some time, we thought it would be
best to release an alpha version so that we could catch any issues before
the actual release.

## Breaking changes

- cssnano & its plugins have been upgraded to PostCSS 6.x. Please ensure that
  for optimal results that you use cssnano with a PostCSS 6 compatible runner
  & that any other plugins are also using PostCSS 6.
- cssnano is now essentially a preset loader and does not contain any built-in
  transforms (instead, it delegates to `cssnano-preset-default` by default).
  Due to the new architecture, it's not possible to exclude asynchronous
  transforms and run it synchronously, unlike in 3.x. Any transforms that
  were "core" modules have now been extracted out into separate packages.
- Because of the new preset system, cssnano will not accept any transformation
  options; these must be set in the preset. The option names remain mostly the
  same, except some cases where "core" modules have been extracted out:
  - `core` is now `normalizeWhitespace`.
  - `reduceBackgroundRepeat` is now `normalizeRepeatStyle`.
  - `reduceDisplayValues` is now `normalizeDisplayValues`.
  - `reducePositions` is now `normalizePositions`.
  - `reduceTimingFunctions` is now `normalizeTimingFunctions`.
  - `styleCache` is now `rawCache`.

  When excluding transforms, we now have an `exclude` option (in 3.x this was
  named `disable`). Similarly, the `safe` option was removed; the defaults
  are now much less aggressive.

- By default, the following transforms are no longer applied to any input CSS.
  You may see an increased output file size as a result:
  - `autoprefixer`
  - `postcss-discard-unused`
  - `postcss-merge-idents`
  - `postcss-reduce-idents`
  - `postcss-zindex`

  Note that you can load `cssnano-preset-advanced` instead which _does_ contain
  these transforms.

- We no longer detect previous plugins to silently exclude our own, and now
  consider this to be an anti-pattern. So `postcss-filter-plugins` was removed.
- We also changed some options to make the default transforms safer:
  - `postcss-minify-font-values`: `removeAfterKeyword` set to `false` from `true`.
  - `postcss-normalize-url`: `stripWWW` set to `false` from `true`.

- cssnano now does not accept the `sourcemap` shortcut option; please refer
  to the PostCSS documentation on sourcemaps. The `quickstart.js` file included
  with this module will give you a good starting point.
- `cssnano.process` is no longer a custom method; we use the built-in `process`
  method exposed on each PostCSS plugin. The new signature is
  `cssnano.process(css, postcssOpts, cssnanoOpts)`, in 3.x it was
  `cssnano.process(css, cssnanoOpts)`.
- We dropped support for Node 0.12, now requiring at least Node 4.
- Finally, cssnano is now developed as a monorepo, due to the fact that some
  transforms have a lot of grey area/overlap. Due to this, some modules have
  been refactored to delegate responsibility to others, such that duplication
  of functionality is minimized. For instance, `postcss-colormin` will no
  longer compress whitespace or compress numbers, as those are handled by
  `postcss-normalize-whitespace` & `postcss-convert-values` respectively.

## Other changes

- Due to the PostCSS 6 upgrade, we have been able to reduce usage of custom
  methods, such as node `clone` behaviour. In cases where some utility
  has been used by several plugins it is now a separate package, reducing
  cssnano's footprint.
- cssnano now makes much better use of Browserslist. `postcss-colormin` &
  `postcss-reduce-initial` were enhanced with different behaviour depending
  on which browsers are passed. And now, the footprint for the `caniuse-db`
  dependency is much smaller thanks to `caniuse-lite` - 7 times smaller as
  of this writing. This makes cssnano much faster to download from npm!

# 3.10.0

- cssnano will no longer `console.warn` any messages when using deprecated
  options; these are now sent to PostCSS. You will be able to see them if you
  use a PostCSS runner with built-in messages support, or alternately by
  loading `postcss-reporter` or `postcss-browser-reporter` in your plugins list.
- Prepares support for `grid` identifier reduction by adding it to the list
  of optimisations turned off when `options.safe` is set to `true`.
- Adds support for normalizing `unicode-range` descriptors. Values will
  be converted when the code matches `0` & `f` in the same place on both sides
  of the range. So, `u+2000-2fff` can be converted to `u+2???`, but
  `u+2100-2fff` will be left as it is.

# 3.9.1

- Resolves an integration issue with `v3.9.0`, where `undefined` values
  would attempt to be parsed.

# 3.9.0

- Adds a new option to normalize wrapping quotes for strings & joining
  multiple-line strings into a single line. This optimisation can potentially
  reduce the final gzipped size of your CSS file.

# 3.8.2

- Resolves an issue where `display: list-item inline flow` would be normalized
  to `inline list-item` rather than `inline-list-item` (thanks to @mattbasta).

# 3.8.1

- Adds a quick start file for easy integration with Runkit. Try cssnano online
  at https://runkit.com/npm/cssnano.

# 3.8.0

- Adds support for normalizing multiple values for the `display` property. For
  example `block flow` can be simplified to `block`.

# 3.7.7

- Further improves CSS mixin handling; semicolons will no longer be stripped
  from _rules_ as well as declarations.

# 3.7.6

- Resolves an issue where the semicolon was being incorrectly stripped
  from CSS mixins.

# 3.7.5

- Resolves an issue where the `safe` flag was not being persisted across
  multiple files (thanks to @techmatt101).

# 3.7.4

- Improves performance of the reducePositions transform by testing
  against `hasOwnProperty` instead of using an array of object keys.
- Removes the redundant `indexes-of` dependency.

# 3.7.3

- Unpins postcss-filter-plugins from `2.0.0` as a fix has landed in the new
  version of uniqid.

# 3.7.2

- Temporarily pins postcss-filter-plugins to version `2.0.0` in order to
  mitigate an issue with uniqid `3.0.0`.

# 3.7.1

- Enabling safe mode now turns off both postcss-merge-idents &
  postcss-normalize-url's `stripWWW` option.

# 3.7.0

- Added: Reduce `background-repeat` definitions; works with both this property
  & the `background` shorthand, and aims to compress the extended two value
  syntax into the single value syntax.
- Added: Reduce `initial` values for properties when the _actual_ initial value
  is shorter; for example, `min-width: initial` becomes `min-width: 0`.

# 3.6.2

- Fixed an issue where cssnano would crash on `steps(1)`.

# 3.6.1

- Fixed an issue where cssnano would crash on `steps` functions with a
  single argument.

# 3.6.0

- Added `postcss-discard-overridden` to safely discard overridden rules with
  the same identifier (thanks to @Justineo).
- Added: Reduce animation/transition timing functions. Detects `cubic-bezier`
  functions that are equivalent to the timing keywords and compresses, as well
  as normalizing the `steps` timing function.
- Added the `perspective-origin` property to the list of supported properties
  transformed by the `reduce-positions` transform.

# 3.5.2

- Resolves an issue where the 3 or 4 value syntax for `background-position`
  were being incorrectly converted.

# 3.5.1

- Improves checking for `background-position` values in the `background`
  shorthand property.

# 3.5.0

- Adds a new optimisation path which can minimise keyword values for
  `background-position` and the `background` shorthand.
- Tweaks to performance in the `core` module, now performs less AST passes.
- Now compiled with Babel 6.

# 3.4.0

- Adds a new optimisation path which can minimise gradient parameters
  automatically.

# 3.3.2

- Fixes an issue where using `options.safe` threw an error when cssnano was
  not used as part of a PostCSS instance, but standalone (such as in modules
  like gulp-cssnano). cssnano now renames `safe` internally to `isSafe`.

# 3.3.1

- Unpins postcss-colormin from `2.1.2`, as the `2.1.3` & `2.1.4` patches had
  optimization regressions that are now resolved in `2.1.5`.

# 3.3.0

- Updated modules to use postcss-value-parser version 3 (thanks to @TrySound).
- Now converts between transform functions with postcss-reduce-transforms.
  e.g. `translate3d(0, 0, 0)` becomes `translateZ(0)`.

# 3.2.0

- cssnano no longer converts `outline: none` to `outline: 0`, as there are
  some cases where the values are not equivalent (thanks to @TrySound).
- cssnano no longer converts for example `16px` to `1pc` _by default_. Length
  optimisations can be turned on via `{convertValues: {length: true}}`.
- Improved minimization of css functions (thanks to @TrySound).

# 3.1.0

- This release swaps postcss-single-charset for postcss-normalize-charset,
  which can detect encoding to determine whether a charset is necessary.
  Optionally, you can set the `add` option to `true` to prepend a UTF-8
  charset to the output automatically (thanks to @TrySound).
- A `safe` option was added, which disables more aggressive optimisations, as
  a convenient preset configuration (thanks to @TrySound).
- Added an option to convert from `deg` to `turn` & vice versa, & improved
  minification performance in functions (thanks to @TrySound).

# 3.0.3

- Fixes an issue where cssnano was removing spaces around forward slashes in
  string literals (thanks to @TrySound).

# 3.0.2

- Fixes an issue where cssnano was removing spaces around forward slashes in
  calc functions.

# 3.0.1

- Replaced css-list & balanced-match with postcss-value-parser, reducing the
  module's overall size (thanks to @TrySound).

# 3.0.0

- All cssnano plugins and cssnano itself have migrated to PostCSS 5.x. Please
  make sure that when using the 3.x releases that you use a 5.x compatible
  PostCSS runner.
- cssnano will now compress inline SVG through SVGO. Because of this change,
  interfacing with cssnano must now be done through an asynchronous API. The
  main `process` method has the same signature as a PostCSS processor instance.
- The old options such as `merge` & `fonts` that were deprecated in
  release `2.5.0` were removed. The new architecture allows you to specify any
  module name to disable it.
- postcss-minify-selectors' at-rule compression was extracted out into
  postcss-minify-params (thanks to @TrySound).
- Overall performance of the module has improved dramatically, thanks to work
  by @TrySound and input from the community.
- Improved selector merging/deduplication in certain use cases.
- cssnano no longer compresses hex colours in filter properties, to better
  support old versions of Internet Explorer (thanks to @faddee).
- cssnano will not merge properties together that have an `inherit` keyword.
- postcss-minify-font-weight & postcss-font-family were consolidated into
  postcss-minify-font-values. Using the old options will print deprecation
  warnings (thanks to @TrySound).
- The cssnano CLI was extracted into a separate module, so that dependent
  modules such as gulp-cssnano don't download unnecessary extras.

# 2.6.1

- Improved performance of the core module `functionOptimiser`.

# 2.6.0

- Adds a new optimisation which re-orders properties that accept values in
  an arbitrary order. This can lead to improved merging behaviour in certain
  cases.

# 2.5.0

- Adds support for disabling modules of the user's choosing, with new option
  names. The old options (such as `merge` & `fonts`) will be removed in `3.0`.

# 2.4.0

- postcss-minify-selectors was extended to add support for conversion of
  `::before` to `:before`; this release removes the dedicated
  postcss-pseudoelements module.

# 2.3.0

- Consolidated postcss-minify-trbl & two integrated modules into
  postcss-merge-longhand.

# 2.2.0

- Replaced integrated plugin filter with postcss-filter-plugins.
- Improved rule merging logic.
- Improved performance across the board by reducing AST iterations where it
  was possible to do so.
- cssnano will now perform better whitespace compression when used with other
  PostCSS plugins.

# 2.1.1

- Fixes an issue where options were not passed to normalize-url.

# 2.1.0

- Allow `postcss-font-family` to be disabled.

# 2.0.3

- cssnano can now be consumed with the parentheses-less method in PostCSS; e.g.
  `postcss([ cssnano ])`.
- Fixes an issue where 'Din' was being picked up by the logic as a numeric
  value, causing the full font name to be incorrectly rearranged.

# 2.0.2

- Extract trbl value reducing into a separate module.
- Refactor core longhand optimiser to not rely on trbl cache.
- Adds support for `ch` units; previously they were removed.
- Fixes parsing of some selector hacks.
- Fixes an issue where embedded base 64 data was being converted as if it were
  a URL.

# 2.0.1

- Add `postcss-plugin` keyword to package.json.
- Wraps all core processors with the PostCSS 4.1 plugin API.

# 2.0.0

- Adds removal of outdated vendor prefixes based on browser support.
- Addresses an issue where relative path separators were converted to
  backslashes on Windows.
- cssnano will now detect previous plugins and silently disable them when the
  functionality overlaps. This is to enable faster interoperation with cssnext.
- cssnano now exports as a PostCSS plugin. The simple interface is exposed
  at `cssnano.process(css, opts)` instead of `cssnano(css, opts)`.
- Improved URL detection when using two or more in the same declaration.
- node 0.10 is no longer officially supported.

# 1.4.3

- Fixes incorrect minification of `background:none` to `background:0 0`.

# 1.4.2

- Fixes an issue with nested URLs inside `url()` functions.

# 1.4.1

- Addresses an issue where whitespace removal after a CSS function would cause
  rendering issues in Internet Explorer.

# 1.4.0

- Adds support for removal of unused `@keyframes` and `@counter-style` at-rules.
- comments: adds support for user-directed removal of comments, with the
  `remove` option (thanks to @dmitrykiselyov).
- comments: `removeAllButFirst` now operates on each CSS tree, rather than the
  first one passed to cssnano.

# 1.3.3

- Fixes incorrect minification of `border:none` to `border:0 0`.

# 1.3.2

- Improved selector minifying logic, leading to better compression of attribute
  selectors.
- Improved comment discarding logic.

# 1.3.1

- Fixes crash on undefined `decl.before` from prior AST.

# 1.3.0

- Added support for bundling cssnano using webpack (thanks to @MoOx).

# 1.2.1

- Fixed a bug where a CSS function keyword inside its value would throw
  an error.

# 1.2.0

- Better support for merging properties without the existance of a shorthand
  override.
- Can now 'merge forward' adjacent rules as well as the previous 'merge behind'
  behaviour, leading to better compression.
- Selector re-ordering now happens last in the chain of plugins, to help clean
  up merged selectors.

# 1.1.0

- Now can merge identifiers such as `@keyframes` and `@counter-style` if they
  have duplicated properties but are named differently.
- Fixes an issue where duplicated keyframes with the same name would cause
  an infinite loop.

# 1.0.2

- Improve module loading logic (thanks to @tunnckoCore).
- Improve minification of numeric values, with better support for `rem`,
  trailing zeroes and slash/comma separated values
  (thanks to @TrySound & @tunnckoCore).
- Fixed an issue where `-webkit-tap-highlight-color` values were being
  incorrectly transformed to `transparent`. This is not supported in Safari.
- Added support for viewport units (thanks to @TrySound).
- Add MIT license file.

# 1.0.1

- Add repository/author links to package.json.

# 1.0.0

- Initial release.

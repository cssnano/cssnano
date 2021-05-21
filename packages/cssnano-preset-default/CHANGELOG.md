# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [5.1.1] (2021-05-21)


### Bug Fixes

* **postcss-colormin:** Strict color parsing ([#1122](https://github.com/cssnano/cssnano/issues/1122)) ([32771da](https://github.com/cssnano/cssnano/commit/32771da46ee94f07a6907ec47701189f90ad2ec0))
* **postcss-colormin:** fix ERR_PACKAGE_PATH_NOT_EXPORTED ([#1110](https://github.com/cssnano/cssnano/issues/1110)) ([8a31ca38796](https://github.com/cssnano/cssnano/commit/8a31ca38796e12e6fe52620cf8a545cb058fe295))


# [5.1.0](https://github.com/cssnano/cssnano/compare/cssnano-preset-default@5.0.0...cssnano-preset-default@5.1.0) (2021-05-19)


### Bug Fixes

* **postcss-merge-rules:** add some missing known pseudo classes. ([#1099](https://github.com/cssnano/cssnano/issues/1099)) ([4d7fe36](https://github.com/cssnano/cssnano/commit/4d7fe367bebab86c7b5664ed4621ee7586ca7d86))
* **postcss-merge-rules:** prevent breaking rule merges ([#1072](https://github.com/cssnano/cssnano/issues/1072)) ([c5e0a5e](https://github.com/cssnano/cssnano/commit/c5e0a5eac171089ae994fcba21d9c565fb462577)), closes [#999](https://github.com/cssnano/cssnano/issues/999)


### Features

* **postcss-colormin:** switch to colord and solve multiple issues ([#1107](https://github.com/cssnano/cssnano/issues/1107)) ([a7f0be4](https://github.com/cssnano/cssnano/commit/a7f0be4acc640aab89cace53a720b3d59b6f7b4f)), closes [#819](https://github.com/cssnano/cssnano/issues/819) [#1042](https://github.com/cssnano/cssnano/issues/1042) [#819](https://github.com/cssnano/cssnano/issues/819) [#771](https://github.com/cssnano/cssnano/issues/771)





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

* **postcss-convert-values:** prevent zero units from being dropped in line-height. ([#801](https://github.com/cssnano/cssnano/issues/801)) ([d781855](https://github.com/cssnano/cssnano/commit/d78185567ae5ebcde0469cf0e55145a7a3130d3e))
* **postcss-merge-rules:** don't change specificity of prefixed properties ([#723](https://github.com/cssnano/cssnano/issues/723)) ([863cf2b](https://github.com/cssnano/cssnano/commit/863cf2b3470d3172523a3165dc368abcfa18809c))
* **postcss-normalize-positions:** correct optimize math (`calc` and etc) and variable functions (`var` and `env`) ([#750](https://github.com/cssnano/cssnano/issues/750)) ([a81e8df](https://github.com/cssnano/cssnano/commit/a81e8dfc1ad26067d5a9efab8081072cd4b15c44))


### chore

* minimum require version of node is 10.13 ([#871](https://github.com/cssnano/cssnano/issues/871)) ([28bda24](https://github.com/cssnano/cssnano/commit/28bda243e32ce3ba89b3c358a5f78727b3732f11))


### Features

* css declaration sorter ([#855](https://github.com/cssnano/cssnano/issues/855)) ([613d562](https://github.com/cssnano/cssnano/commit/613d562ae79e7e169c80b523b7c2c9b0093bc1d8))
* migarete to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))
* **postcss-merge-rules:** merge at-rules ([#722](https://github.com/cssnano/cssnano/issues/722)) ([8d4610a](https://github.com/cssnano/cssnano/commit/8d4610a6391ddab29bcb08ef0522d0b7ce2d6582))
* **postcss-ordered-values:** compress more vendor properties ([#746](https://github.com/cssnano/cssnano/issues/746)) ([b479440](https://github.com/cssnano/cssnano/commit/b4794404bffa54558654b215eb550e6adb98e144))


### BREAKING CHANGES

* minimum supported `postcss` version is `8.2.1`
* minimum require version of node is 10.13



## 4.1.9 (2019-02-12)



## 4.1.7 (2018-10-22)



## 4.1.6 (2018-10-22)



## 4.1.5 (2018-10-17)



## 4.1.4 (2018-09-27)



## 4.1.2 (2018-09-25)



## 4.1.1 (2018-09-24)


### Bug Fixes

* parse error with iPhone X feature ([#614](https://github.com/cssnano/cssnano/issues/614)) ([a3704a7](https://github.com/cssnano/cssnano/commit/a3704a76a631b1cd907ab0c0a8637a622769676d))
* **postcss-merge-longhand:** not mangle border output ([#555](https://github.com/cssnano/cssnano/issues/555)) ([9a70605](https://github.com/cssnano/cssnano/commit/9a706050b621e7795a9bf74eb7110b5c81804ffe)), closes [#553](https://github.com/cssnano/cssnano/issues/553) [#554](https://github.com/cssnano/cssnano/issues/554)
* **postcss-merge-longhand:** Should not mangle borders ([#579](https://github.com/cssnano/cssnano/issues/579)) ([#583](https://github.com/cssnano/cssnano/issues/583)) ([4d3b3f8](https://github.com/cssnano/cssnano/commit/4d3b3f8fa5a389329989b13f85f3523e56c81435))


### Features

* **postcss-ordered-values:** support ordering animation values ([#574](https://github.com/cssnano/cssnano/issues/574)) ([17ec039](https://github.com/cssnano/cssnano/commit/17ec039dfbe7f596df12f5d5889bf3e6cd32afd6))

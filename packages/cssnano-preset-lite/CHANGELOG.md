# Change Log

## 6.0.10

### Patch Changes

- fix(postcss-normalize-whitespace): trim and collapse spaces and tabs between the names of each string row in `grid-template-areas`, `grid-template` and `grid`.

## 6.0.9

### Patch Changes

- fix: update postcss to 8.5.29

## 6.0.8

### Patch Changes

- feat(cssnano-utils): add sameContainer export

## 6.0.7

### Patch Changes

- Keep an empty `@layer` block when it may fix the layer order. Decode CSS escapes before comparing `@layer` names.

## 6.0.6

### Patch Changes

- Stop turning a comment inside a selector into a descendant combinator. A comment is not whitespace, so `div/*c*/span` is not the same selector as `div span`. It now becomes `div/**/span` instead. Comments that can be removed without joining two tokens are still removed, so `.a/*c*/.b` becomes `.a.b`.

## 6.0.5

### Patch Changes

- Omit redundant whitespace after @media and @supports when parameters begin with parentheses, and normalize multi-character whitespace after at-rule keywords.

- fix: update browserslist

## 6.0.4

### Patch Changes

- Remove comments more reliably and preserve the ones you keep exactly. Comments are now removed from declaration values that carry `!important`, and comment detection respects CSS token boundaries: text inside unquoted `url()` values and behind escape sequences in strings and identifiers is no longer mistaken for a comment. Kept comments are emitted byte-for-byte, including an unclosed comment at the end of a value, and whitespace inside kept comments is left untouched. Removal state is scoped to each document, so a shared processor no longer carries `removeAllButFirst` first-comment state between runs, and the `remove` callback runs once per comment occurrence. A non-function `remove` option now fails with a `TypeError`.

- Value transforms now read the CSS Values 4 math function names from one `mathFunctions` table in `cssnano-utils`, so unit retention, box and shorthand merging, parameter and whitespace handling, and time classification agree on which functions count as math functions. Serialized output is unchanged.

- perf: median 15% speed increase on test fixtures

- Remove insignificant whitespace around custom-property names and, in standard declarations, around `env()` custom-ident arguments and around comma delimiters in `var()`, `env()`, and `constant()`. Between a custom-property name and its value, only the parser-consumed leading whitespace run is dropped; authored whitespace elsewhere in the value, such as after a preserved comment, is preserved per CSS Variables 1. Required whitespace between distinct tokens and the single whitespace token in an empty fallback remain preserved, and a preserved comment kept between a declaration name and value now survives minification, for custom properties and standard declarations alike. Comment removal in selectors and values no longer fuses the tokens the comment sat between: an attribute case-insensitivity flag or any other name-like token keeps its boundary, and math-operator spacing is restored for every function whose value productions accept `<calc-sum>` arguments (including `calc-size()`, `calc-mix()`, and `random()`). Values without comments are now left byte-for-byte untouched rather than re-spaced.

- Preserve whitespace around division operators across all modern CSS math functions such as `min()`, `max()`, and `clamp()`, and ensure commas in nested calculations have extraneous whitespace trimmed.

- Use ASCII case-insensitive matching for CSS names and grammar keywords so Unicode lookalikes are preserved, and restrict CSS whitespace normalization to the CSS whitespace set.

- Updated dependencies:
  - cssnano-utils@8.0.0

## 6.0.3

### Patch Changes

- fix: updae browserslist, mdn-data, autoprefixer

## 6.0.2

### Patch Changes

- fix: update postcss and selector parser

- fix: update PostCSS peer dependency

## 6.0.1

### Patch Changes

- fix: ensure older tools can resolve cssnano packages

## 6.0.0

### Major Changes

- The cssnano packages are now native ESM and require Node `^22.22.3 || ^24.15.0 || >=26.0`. Package subpath imports are no longer supported. See the migration documentation before upgrading.

### Patch Changes

- Updated dependencies:
  - cssnano-utils@7.0.0
  - postcss-discard-comments@9.0.0
  - postcss-discard-empty@9.0.0
  - postcss-normalize-whitespace@9.0.0

## 5.0.6

### Patch Changes

- fix(postcss-normalize-charset): ensure idempotent charset normalization

## 5.0.5

### Patch Changes

- fix(postcss-discard-empty): remove empty cascade layers when they do not affect the layer ordering

- fix(postcss-normalize-whitespace): stop dropping the escaped character in a trailing backslash escape

  Keep the whitespace character when a declaration ends in a backslash character followed by a whitespace character and the declaration is the last in its rule, instead of leaving a dangling character and invalid CSS

## 5.0.4

### Patch Changes

- fix: ensure packages reach registry with correct repository field

## 5.0.3

### Patch Changes

- fix: update dependencies

## 5.0.2

### Patch Changes

- chore: regenerate all type definitions with TypeScript 7

- fix: update svgo, autoprefixer and postcss

- fix: update PostCSS

- chore: define package.json exports

- chore: update dependencies

  Update autoprefixer, browserslist, colordx and postcss

## 5.0.1

### Patch Changes

- chore: update the postcss peer dependency
- Updated dependencies
- Updated dependencies [b245a0b]
- Updated dependencies [3bf3f4d]
  - postcss-normalize-whitespace@8.0.1
  - postcss-discard-comments@8.0.1
  - postcss-discard-empty@8.0.1
  - cssnano-utils@6.0.1

## 5.0.0

### Major Changes

- ea8e33a: chore: drop Node.js 20 support

  Node.js 20 has reached end of life.

### Patch Changes

- aa11a12: chore: update PostCSS
- Updated dependencies [aa11a12]
- Updated dependencies [ea8e33a]
  - postcss-normalize-whitespace@8.0.0
  - postcss-discard-comments@8.0.0
  - postcss-discard-empty@8.0.0
  - cssnano-utils@6.0.0

## 4.0.6

### Patch Changes

- 7e56dba: fix: update postcss
- Updated dependencies [7e56dba]
  - postcss-normalize-whitespace@7.0.3
  - postcss-discard-comments@7.0.8
  - postcss-discard-empty@7.0.3
  - cssnano-utils@5.0.3

## 4.0.5

### Patch Changes

- 322ad33: fix: update postcss peer dependency
- Updated dependencies [322ad33]
  - postcss-normalize-whitespace@7.0.2
  - postcss-discard-comments@7.0.7
  - postcss-discard-empty@7.0.2
  - cssnano-utils@5.0.2

## 4.0.4

### Patch Changes

- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities
- Updated dependencies [171b669]
- Updated dependencies [4772407]
- Updated dependencies [5672148]
  - postcss-discard-comments@7.0.4
  - postcss-normalize-whitespace@7.0.1
  - postcss-discard-empty@7.0.1
  - cssnano-utils@5.0.1

## 4.0.3

### Patch Changes

- Updated dependencies [1d65a10]
  - postcss-discard-comments@7.0.3

## 4.0.2

### Patch Changes

- Updated dependencies [dff5c42]
  - postcss-discard-comments@7.0.2

## 4.0.1

### Patch Changes

- Updated dependencies [9e8606a]
  - postcss-discard-comments@7.0.1

## 4.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

### Patch Changes

- Updated dependencies [0d10597]
  - postcss-normalize-whitespace@7.0.0
  - postcss-discard-comments@7.0.0
  - postcss-discard-empty@7.0.0
  - cssnano-utils@5.0.0

## 3.1.0

### Minor Changes

- feat: add preset and plugin options for browserslist

### Patch Changes

- enable “go to definition” via declaration maps
- Updated dependencies
  - cssnano-utils@4.0.2
  - postcss-discard-comments@6.0.2
  - postcss-discard-empty@6.0.3
  - postcss-normalize-whitespace@6.0.2

## 3.0.2

### Patch Changes

- Updated dependencies [4bf74ef]
  - postcss-discard-empty@6.0.2

## 3.0.1

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- Updated dependencies [18331a6]
  - cssnano-utils@4.0.1
  - postcss-discard-comments@6.0.1
  - postcss-discard-empty@6.0.1
  - postcss-normalize-whitespace@6.0.1

## 3.0.0

### Major Changes

- ca9d3f55: Switch minimum supported Node version to 14 for all packages

### Patch Changes

- Updated dependencies [ca9d3f55]
  - postcss-normalize-whitespace@6.0.0
  - postcss-discard-comments@6.0.0
  - postcss-discard-empty@6.0.0
  - cssnano-utils@4.0.0

## 2.1.3

### Patch Changes

- chore: update TypeScript and improve types
- Updated dependencies
  - postcss-discard-comments@5.1.2

## 2.1.2

### Patch Changes

- fix: correct package.json dependency version specifier

## 2.1.1

### Patch Changes

- fix: improve type declarations

## 2.1.0

### Minor Changes

- feature: add TypeScript type declarations

### Patch Changes

- Updated dependencies
  - cssnano-utils@3.1.0
  - postcss-discard-comments@5.1.0
  - postcss-discard-empty@5.1.0
  - postcss-normalize-whitespace@5.1.0

## 2.0.3

### Patch Changes

- Publish untranspiled CommonJS source
- Updated dependencies
  - cssnano-utils@3.0.2
  - postcss-discard-comments@5.0.3
  - postcss-discard-empty@5.0.3
  - postcss-normalize-whitespace@5.0.4

## 2.0.2 (2022-01-07)

### Patch Changes

- refactor: remove getMatch function from cssnano-utils

  The getMatch function allows nested arrays to emulate a map.
  It is better to replace this function with a regular Map().
  It's unlikely this function is used outside of cssnano as it requires
  a very specific nested array struture.

- Updated dependencies
  - cssnano-utils@3.0.0
  - postcss-normalize-whitespace@5.0.2

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [2.0.1](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0...cssnano-preset-lite@2.0.1) (2021-05-19)

**Note:** Version bump only for package cssnano-preset-lite

# [2.0.0](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0-rc.2...cssnano-preset-lite@2.0.0) (2021-04-06)

**Note:** Version bump only for package cssnano-preset-lite

# [2.0.0-rc.2](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0-rc.1...cssnano-preset-lite@2.0.0-rc.2) (2021-03-15)

**Note:** Version bump only for package cssnano-preset-lite

# [2.0.0-rc.1](https://github.com/cssnano/cssnano/compare/cssnano-preset-lite@2.0.0-rc.0...cssnano-preset-lite@2.0.0-rc.1) (2021-03-04)

**Note:** Version bump only for package cssnano-preset-lite

# 2.0.0-rc.0 (2021-02-19)

### Features

- migrate to PostCSS 8 ([#975](https://github.com/cssnano/cssnano/issues/975)) ([40b82dc](https://github.com/cssnano/cssnano/commit/40b82dca7f53ac02cd4fe62846dec79b898ccb49))

### BREAKING CHANGES

- minimum supported `postcss` version is `8.2.1`

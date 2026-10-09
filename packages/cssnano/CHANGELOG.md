# Change Log

## 9.5.0

### Minor Changes

- feat(postcss-normalize-unicode): merge adjacent, overlapping, and out-of-order unicode-range entries, and emit a wildcard range when they cover a range expressible with trailing `?` wildcards

### Patch Changes

- fix(postcss-normalize-whitespace): trim and collapse spaces and tabs between the names of each string row in `grid-template-areas`, `grid-template` and `grid`.

## 9.4.0

### Minor Changes

- feat(cssnano-preset-default): run postcss-merge-longhand again after postcss-merge-rules, so declarations overridden in a later rule with the same selector are discarded

- feat(postcss-merge-longhand): merge flow-relative and physical box properties safely

  The plugin now merges and shortens `margin-block`, `margin-inline`, their `padding`, `inset`, `scroll-margin` and `scroll-padding` counterparts, and the physical `inset`, `scroll-margin` and `scroll-padding` longhands. It never assumes a writing mode or direction, so a flow-relative declaration moves only where no physical declaration of the same group. It creates a shorthand only when every browserslist target supports it.

- feat(postcss-merge-longhand): discard overridden same-property declarations

  Within a rule, a declaration is dropped when a later declaration of the same property and the same `!important` overrides it, and every browser that accepts the earlier value accepts the later one.

### Patch Changes

- fix: update postcss to 8.5.29

- fix(postcss-merge-longhand): keep fallbacks for older browsers in more cases. Longhands that use `calc()` merge into a shorthand only when every target parses `calc()`, which Opera Mini, and so the default targets, do not. When a browserslist target predates the support floor (such as IE 8 or Opera 12), the plugin keeps fallbacks for `rem`, angle and time units and `hsl()`, so `font-size:16px` before `font-size:1rem` survives.

- fix: update color processing library

- fix(postcss-merge-longhand): add missing tokenizer runtime dependency

## 9.3.2

### Patch Changes

- Leave `animation` untouched when the keyframes name is a keyword another longhand would claim, such as `animation: ease 1s linear`. Reordering the name first made browsers read it as the timing function, direction, fill mode or play state.

- Omit trailing zero blur radius and spread distance in `box-shadow`, e.g. `0 50px 0 0 #fff` becomes `0 50px #fff`.

- Merge `column-width` and `column-count` into `columns` when the width is zero, for example `column-width:0px;column-count:2` becomes `columns:0px 2`. CSS Sizing 4 allows a zero `column-width`; a zero `column-count` stays invalid and is left untouched.

- Share declarations among several adjacent rules also if the file size can be reduced by merging more than two rules. Previously rules were only merged when the first merge immediately yielded a saving, without checking if further merging was possible.

## 9.3.1

### Patch Changes

- feat(cssnano-utils): add sameContainer export

## 9.3.0

### Minor Changes

- Merge rules with the same selector and sibling `@media`, `@supports` and `@container` blocks with identical conditions even when other rules sit between them, when none of those rules sets a conflicting property.Do not merge rules across `all`, shorthands that reset their longhands, logical properties that can address the same side, and at-rules whose order matters, such as `@layer` and `@import`. Adjacent rules with the same selector now become one rule. Add the selectors of a later rule to an earlier rule with the identical declaration.

### Patch Changes

- Keep an empty `@layer` block when it may fix the layer order. Decode CSS escapes before comparing `@layer` names.

- Remove the enclosing named `@layer` and conditional blocks that moving a rule out of a nested conditional group rule left empty.

- Do not merge nested rules when a conflicting declaration from the enclosing rule lies between them, so `.p{&{color:red}color:blue;&{color:red}}` stays red instead of blue.

- Determine the vendor prefix of a selector only from its pseudo-class and pseudo-element names. A class name or attribute value such as `.x-moz-y` or `[title=":-moz-x"]` no longer blocks merging with a `::-moz-selection` rule, and a selector that mixes two vendor prefixes is never merged. Compare pseudo-element names case-insensitively, so `::-WEBKIT-scrollbar` now counts as WebKit-prefixed and stays apart from unprefixed rules.

## 9.2.2

### Patch Changes

- Fix an infinite loop: when equal `@media` blocks were separated by an  at-rule such as `@layer x;`, `@font-face` or `@page`, the plugin would keep merging a rule into itself until memory ran out.

  Fix a bug when the plugin moved a rule into a block nested inside another block: a later merge could combine two rules in reverse order and change which declaration wins.

## 9.2.1

### Patch Changes

- Remove a declaration that a later sibling `@media`, `@supports`, `@container` or named `@layer` block with identical conditions repeats, so duplicates are dropped before `postcss-merge-rules` joins the blocks.

  Keep an earlier duplicate `@media`, `@supports` or `@container` block that declares an `@layer`, so removing it no longer moves the layer's first appearance and changes the layer order. Also keep a rule that holds a `/*!` comment when its declarations are removed.

  Keep a duplicate `@import`, so removing the earlier copy no longer changes the layer order.

- Keep `"revert-rule"` quoted in `font-family` because `revert-rule` is a CSS-wide keyword.

- Recognise `revert-rule` as a CSS-wide keyword. `postcss-ordered-values` no longer reorders a `border`, `animation`, `transition`, `list-style`, `box-shadow` or `grid-row` value as if `revert-rule` were a color, name or type. The reserved keywords are now generated from `@webref/css`.

## 9.2.0

### Minor Changes

- Merge box alignment properties into the `place-content`, `place-items` and `place-self` shorthands, such as `align-items:center;justify-items:start` into `place-items:center start`. This only happens when every browser in your Browserslist targets supports the shorthands, because a browser that does not would ignore both alignments. The `defaults` query includes browsers with unknown support, such as Opera Mini and UC Browser, so it keeps the longhands. Values that use `safe`, `unsafe` or `last baseline` merge only when both values use the same keywords. `postcss-merge-longhand` now accepts the Browserslist options `overrideBrowserslist`, `stats`, `path` and `env`.

### Patch Changes

- Write numbers in scientific notation when it is shorter, such as `1e-6px` for `0.000001px` and `1e6px` for `1000000px`. This also applies when `length` unit conversion is disabled. Numbers written without a decimal point, such as `z-index:1000000`, keep their form, because an `<integer>` cannot use scientific notation.

- Stop merging longhands across a nested rule or at-rule. The shorthand ended up after the nested rule and overrode it, so in `a{margin-top:1px;&{margin-top:2px}…}` the nested `margin-top` was lost. This applies to `margin`, `padding`, `border`, `border-radius` and `columns`. Declarations on each side of a nested rule are now merged separately. An at-rule without a block, such as `@apply x;`, also separates them, since it may add declarations. An empty rule such as `&{}` does not. A `border-image` or `all` declaration before a nested rule no longer prevents merging the `border` longhands after it.

- Stop merging rules that have an invalid selector, such as `b: hover`, `[a b]`, `:lang(en fr)` or `a||b`. An invalid selector makes the whole selector list invalid, so the browser also dropped the valid rule it was merged with.

- Only treat a dimension as the font size in the `font` shorthand when it has a length unit. An invalid value such as `font:bold 1s "Arial Black"` is now left unchanged.

- Leave the `font` shorthand unchanged when it contains `attr()`, `if()`, `inherit()` or a custom function such as `--name()`, as already done for `var()` and `env()`. Their result is only known when the browser computes the value.

- Remove a zero color stop position only when it has the right type for the gradient. `conic-gradient()` now drops `0deg` and keeps an invalid `0px`, while linear and radial gradients still drop `0px`. `-webkit-linear-gradient()` keeps `to bottom` and other `to` directions as written, since the prefixed syntax measures angles differently.

- Stop turning a comment inside a selector into a descendant combinator. A comment is not whitespace, so `.a/**/.b` selects elements with both classes, including inside `:is()`, and is no longer rewritten as `.a .b`. Invalid selectors such as `div/**/span` are left as written instead of becoming valid.

- Leave rules with an invalid selector unchanged, including an ID selector that starts with a digit, such as `#1a`, and a combinator after a pseudo-element, such as `a::before b`.

- Shorten `top center` and `bottom center` to `top` and `bottom`, instead of `0` and `100%`, which the browser reads as horizontal positions. `center top` and `center bottom` are now shortened the same way.

  Leave a position unchanged when it cannot be safely rewritten:

  - in a `background` layer where another value splits the position, as in `left no-repeat center`, which is invalid;
  - when it contains a function such as `attr()`, `if()` or a custom `--function()`, which may return a keyword, as `var()` already did;
  - when an invalid three-value position contains a math function, such as `left abs(1px) top`, as `calc()` already did.

- Keep strings unchanged when removing a line continuation (a backslash before a newline) right after an escape. In `"\31` followed by a line continuation and `2"`, joining the lines would turn `\31` into `\312`, so the result is now `"\31 2"`.

  Leave `@charset` unchanged. Browsers only recognize it with double quotes, so rewriting single quotes would make an ignored `@charset` take effect.

- Update `postcss-calc` to 11.2.2. Multiplications inside `calc()` now keep their original operand order, so `calc(var(--x) * 5)` is no longer rewritten as `calc(5 * var(--x))`.

## 9.1.2

### Patch Changes

- Omit redundant whitespace after @media and @supports when parameters begin with parentheses, and normalize multi-character whitespace after at-rule keywords.

- fix: update browserslist

## 9.1.1

### Patch Changes

- Preserves Unicode range tokens (`unicode-range`) in font descriptors and custom properties, preventing code point ranges from being corrupted into invalid numbers or dimensions.

## 9.1.0

### Minor Changes

- Merge corner `border-*-radius` longhands into `border-radius` shorthands. Four complete corner declarations in the same importance lane now collapse into one shorthand, with horizontal and vertical axes minified independently and separated by a slash when distinct. Declarations in the radius family are decoupled from physical border fast-path eligibility, allowing rules containing both physical borders and border radii to optimize both families.

### Patch Changes

- Merge margin, padding, border, border-radius, columns, and border-spacing declarations inside at-rule containers such as `@page`, `@position-try`, and nested at-rules. Fold identical horizontal and vertical `border-spacing` components to a single value. Recognize `columns` shorthands combining a count and a math function in either order, and preserve invalid declarations as written: border shorthands with multiple styles and `columns` values combining CSS-wide keywords with widths or counts no longer discard preceding valid longhands.

- Preserves percentage units in registered custom-property initial values with composite syntax, ranges, groups, and multipliers, and avoids clamping numeric operands nested inside alpha-value functions.

- Restricts color minification to CSS properties that accept `<color>` and custom properties, preserving custom identifiers in properties like `animation-name`, `grid-area`, and `counter-reset`. Adds support for `hwb()` color values and minification inside `color-mix()`, `light-dark()`, and `var()` fallbacks, while preserving relative color syntax, math functions, and token boundary separators.

- Preserves zero percentage units in rgb(), rgba(), and modern CSS Color 4 functions to avoid invalid syntax, respects disabled time conversions for 0ms, clamps percentage opacity values adhering to CSS Color 4 alpha semantics, and improves compatibility with uppercase at-rules and vendor-prefixed keyframes.

- Preserves zero length in `columns` shorthands and zero units inside `@property` with `<angle-percentage>` syntax, retaining keyframe percentage units under nested rules. Symmetrically rounds negative numbers when precision is configured, converts between metric units (`mm`, `cm`, `q`), preserves zero percentages on SVG stroke properties to retain transition interpolation, and caches Browserslist lookups across runs. Also preserves units inside CSS Fonts 5 override descriptors, `anchor()` functions, `flex-basis`, and IE-targeted sizing properties.

- Remove comments more reliably and preserve the ones you keep exactly. Comments are now removed from declaration values that carry `!important`, and comment detection respects CSS token boundaries: text inside unquoted `url()` values and behind escape sequences in strings and identifiers is no longer mistaken for a comment. Kept comments are emitted byte-for-byte, including an unclosed comment at the end of a value, and whitespace inside kept comments is left untouched. Removal state is scoped to each document, so a shared processor no longer carries `removeAllButFirst` first-comment state between runs, and the `remove` callback runs once per comment occurrence. A non-function `remove` option now fails with a `TypeError`.

- Adds the balanced token index used by selector, parameter, and gradient minification while preserving their serialized CSS output.

- Improve conformance for modern CSS math functions, grid-line values, and case-sensitive attribute selector modifiers while preserving ambiguous or invalid declarations. The affected transforms now use bounded, linear scans for these forms.

- Value transforms now read the CSS Values 4 math function names from one `mathFunctions` table in `cssnano-utils`, so unit retention, box and shorthand merging, parameter and whitespace handling, and time classification agree on which functions count as math functions. Serialized output is unchanged.

- Standardize output normalization for margin, padding, and physical border properties. Property names and case-insensitive keywords in generated shorthands and normalized standalone shorthand declarations are canonicalized to lowercase, while preserving author casing for unmerged longhands, custom properties, hack prefixes, and unresolved values.

- perf: median 15% speed increase on test fixtures

- `postcss-normalize-url` now decodes quoted `url(...)` values, preserving literal backslashes and escape sequences whether quotes are stripped or kept.
  Relative URLs now normalize using POSIX path semantics across all platforms, and converted `@namespace` URLs escape double quotes.

- Join every escaped line continuation in a multiline `url()` value into one line, including `\r\n` continuations that previously survived and left an invalid string behind. Rewriting a `@namespace` URL no longer overwrites the tokens that follow it, so trailing text is preserved and multiple URLs in one namespace declaration are each normalized.

- Remove insignificant whitespace around custom-property names and, in standard declarations, around `env()` custom-ident arguments and around comma delimiters in `var()`, `env()`, and `constant()`. Between a custom-property name and its value, only the parser-consumed leading whitespace run is dropped; authored whitespace elsewhere in the value, such as after a preserved comment, is preserved per CSS Variables 1. Required whitespace between distinct tokens and the single whitespace token in an empty fallback remain preserved, and a preserved comment kept between a declaration name and value now survives minification, for custom properties and standard declarations alike. Comment removal in selectors and values no longer fuses the tokens the comment sat between: an attribute case-insensitivity flag or any other name-like token keeps its boundary, and math-operator spacing is restored for every function whose value productions accept `<calc-sum>` arguments (including `calc-size()`, `calc-mix()`, and `random()`). Values without comments are now left byte-for-byte untouched rather than re-spaced.

- Preserve whitespace around division operators across all modern CSS math functions such as `min()`, `max()`, and `clamp()`, and ensure commas in nested calculations have extraneous whitespace trimmed.

- Orders `columns: 2 auto` as `columns: auto 2`. Leaves animation declarations with negative iteration counts unchanged. Reorders border and box-shadow math functions that resolve to a length, such as `calc(1px + 1em)`, and leaves other math unchanged. Passes through unknown box-shadow color functions instead of reordering them.

- Merge duplicate `@keyframes` and `@counter-style` definitions more conservatively.

- Use ASCII case-insensitive matching for CSS names and grammar keywords so Unicode lookalikes are preserved, and restrict CSS whitespace normalization to the CSS whitespace set.

- Rename identifiers only when their definition and a reference share a stylesheet; leave alone names inside `var()`, `env()`, `attr()`, or a custom property fallback; skip reserved words in the encoder; rename `reversed()` counters and implicit `<area>-start`/`-end` lines with their area.

- Preserve Windows drive roots, directory dot references, and leading `./` prefixes when the first relative segment contains a colon. Decode unreserved percent-encoded octets while preserving percent-encoded dots, normalize `@import` at-rules including nested condition URLs, retain quotes for URLs containing non-printable control characters, avoid unnecessary declaration tokenization, and synchronize raw parameters.

- Minify equal shorthand components for two-axis, four-side, alignment, aspect-ratio, and transition declarations while preserving grammar-sensitive and invalid values.

- fix(postcss-minify-params): support CSS values level 4 and Media Queries level 5

- Preserves invalid selector syntax and namespace-sensitive universal selectors while safely normalizing pseudo-element, View Transition, and keyframe forms. Recognizes the full token grammar for An+B formulas, including escaped forms and exact large integers.

- fix(postcss-ordered-values): improve performance and correctness

- Aligns SVG data URI processing with WHATWG URL standards by treating the first `#` as the fragment delimiter. Non-conforming data URLs (such as those with malformed percent-encoding or where an unencoded `#` in markup truncates the SVG payload) are left untouched rather than parsed with an internal XML recovery scanner. CSS hex escapes in the URI scheme (for example `d\61ta:image/svg+xml`) reach the optimizer. SVG data URIs inside CSS Values 4 `src(...)` functions or `url(...)` declarations with url-modifiers are optimized while preserving modifiers and comments. Minified declarations also keep their raw value metadata in sync.

- Unify physical-border optimization under a single reducer that chooses deterministic shortest non-crossing canonical shorthands from complete side and component groups, partitioned by importance lane. Partial grids no longer require a full border reset. Dynamic declarations, style hacks, CSS-wide keywords, support fallbacks, unresolved substitutions, and other cascade barriers remain in their original positions, while valid fallback and border-image behavior is preserved.

- Parse font weights and column units from tokenizer metadata. This safely minifies escaped `bold` weights, recognizes escaped length units, and prevents partial rewrites of invalid font shorthands while preserving original source spelling.

- update browserslist

- Preserve matching-importance all reset boundaries when merging margin, padding, physical border-radius, and columns declarations, so minification does not restore values cleared by the reset.

## 9.0.5

### Patch Changes

- fix: updae browserslist, mdn-data, autoprefixer

- fix(postcss-svgo): better decode encoded SVG

- fix: update postcss-calc

- fix: update calc and color minifiers, autoprefixer

## 9.0.4

### Patch Changes

- fix(cssnano-preset-default): update postcss-calc

## 9.0.3

### Patch Changes

- fix(postcss-colormin, postcss-minify-gradients): update color parsing library

- fix: update postcss and selector parser

- fix: update conflict detection and color conversion CSS spec conformance

- fix: update PostCSS peer dependency

## 9.0.2

### Patch Changes

- fix: ensure older tools can resolve cssnano packages

## 9.0.1

### Patch Changes

- perf(postcss-minify-selectors): avoid quadratic selector scanning

- pef(stylehacks): avoid rescanning the nodes when checking for compatibility hacks

## 9.0.0

### Major Changes

- breaking: do not load configuration from package.json

- cssnano now discovers configuration only in the current working directory, using `.cssnanorc.json` or `cssnano.config.js` in that order.

- The cssnano packages are now native ESM and require Node `^22.22.3 || ^24.15.0 || >=26.0`. Package subpath imports are no longer supported. See the migration documentation before upgrading.

- fix!(cssnano): introduce new postcss-calc plugin

### Patch Changes

- Updated dependencies:
  - cssnano-preset-default@9.0.0

## 8.0.10

### Patch Changes

- fix(postcss-normalize-charset): ensure idempotent charset normalization

## 8.0.9

### Patch Changes

- fix: update svg and color processors

## 8.0.8

### Patch Changes

- fix(postcss-minify-gradients): follow CSS specification more closely when minifying gradients

## 8.0.7

### Patch Changes

- fix(postcss-ordered-values): recognise easing functions

- fix(postcss-reduce-initial): update MDN data

- fix(cssnano): tighten option types

- perf(postcss-merge-rules): cache negative browser-support results when deciding whether to merge rules

  Checking whether a selector feature is supported by the target browsers previously skipped the cache whenever the feature was not supported, so every occurrence of an unsupported feature re-ran the browserslist/caniuse lookup. This is now cached, which speeds up rule merging.

- fix(postcss-discard-empty): remove empty cascade layers when they do not affect the layer ordering

- fix(postcss-normalize-whitespace): stop dropping the escaped character in a trailing backslash escape

  Keep the whitespace character when a declaration ends in a backslash character followed by a whitespace character and the declaration is the last in its rule, instead of leaving a dangling character and invalid CSS

## 8.0.6

### Patch Changes

- fix(postcss-minify-selectors): preserve namespaced universal selector

- fix(postcss-merge-rules): keep the cascade intact when hoisting declarations

- fix(postcss-merge-rules): decide property conflicts from spec data

  The plugin decides whether to reorder declarations using `@webref/css` data instead of a name-based heuristic. For example, the plugin now recognizes that `font` and `line-height`, `border-width` and `border-left`, `gap` and `row-gap`, and `inset` and `top` conflict, and that a flow-relative property and its physical counterpart override each other.

  The plugin now merges properties that do not override each other, but only share part of the name, such as flex` and `flex-direction`. Vendor extensions that are not part of a W3C specification still fall back to comparing names.

- fix(postcss-merge-longhand): improve shorthand merging correctness

  Reject merges producing invalid values for `border`, `margin`, or `padding`; do not confuse math functions with border styles or colors; preserve fallback declarations before functions like `env()` or `calc()`; correctly weight `!important`; and stop resurrecting declarations overridden elsewhere.

- fix: ensure packages reach registry with correct repository field

- fix(postcss-merge-rules): merge interleaved declarations correctly

- fix(postcss-reduce-idents): rewrite identifiers based on spec data

  Which declarations define and reference a custom identifier now comes from `@webref/css` instead of matching property names against a substring. The plugin no longer leaves a renamed identifier dangling behind:

  - a `@counter-style` renamed while another rule's `fallback` descriptor, or a `counter()`/`counters()`/`target-counter()` argument, still names it by its old name
  - a gridline or grid area named by the `grid` shorthand, which was never rewritten even though the `grid-area` placing against it was
  - a gridline named inside `repeat()` or `minmax()`
  - a counter the experimental `string-set` property

  It also no longer renames a keyframe name appearing where it is not allowed, such as `animation-timing-function`, and only renames the argument of a counter function that names a counter, rather than every word inside it.

  Identifiers identical to a keyword of the property or descriptor, such as an animation called `linear`, a counter style called `inside`, or the `words` of `speak-as: words`, are now left alone: which of the two a value means depends on the order the grammar is matched in, so renaming it was unsafe.

  The counters the user agent maintains itself, `list-item` and `page`, are no longer renamed either.

## 8.0.5

### Patch Changes

- fix(postcss-merge-longhand): avoid merging border declarations when result is not equivalent

- fix: update dependencies

## 8.0.4

### Patch Changes

- fix(postcss-svgo): encode chracters in the correct order

- fix(postcss-svgo): do not roll our own URI encoding

  Our own code, while producing smaller output, might end up producing
  the wrong encoding, since it does not encode all characters.

## 8.0.3

### Patch Changes

- fix(postcss-normalize-url): add missing TypeScript files

- chore: regenerate all type definitions with TypeScript 7

- fix: update svgo, autoprefixer and postcss

- fix: update PostCSS

- chore: define package.json exports

- chore: update dependencies

  Update autoprefixer, browserslist, colordx and postcss

## 8.0.2

### Patch Changes

- chore: update the postcss peer dependency
- Updated dependencies
  - cssnano-preset-default@8.0.2

## 8.0.1

### Patch Changes

- fix(postcss-minify-selectors): avoid folding some selectors incorrectly
- Updated dependencies
  - cssnano-preset-default@8.0.1

## 8.0.0

### Major Changes

- ea8e33a: chore: drop Node.js 20 support

  Node.js 20 has reached end of life.

- d7c57da: Removed `cssDeclarationSorter` from the `default` preset. It remains enabled in
  the `advanced` preset.

  ## Motivation

  The plugin can cause breakages without notice whenever a new CSS longhand
  property is released to browsers if it happens to cause a conflict with another
  longhand property. To ensure safety and predictability, it is no longer enabled
  by default.

  ## How to Update

  If you rely on declaration sorting, you can switch to the `advanced` preset or
  explicitly enable `cssDeclarationSorter` in your configuration.

### Patch Changes

- aa11a12: chore: update PostCSS
- Updated dependencies [aa11a12]
- Updated dependencies [ea8e33a]
- Updated dependencies [d7c57da]
  - cssnano-preset-default@8.0.0

## 7.1.9

### Patch Changes

- fix(postcss-minify-selectors): do not fold non-standard selectors
- Updated dependencies
  - cssnano-preset-default@7.0.17

## 7.1.8

### Patch Changes

- 0005443: fix(postcss-minify-selectors): fix wrong behaviour when merging into is()
- 7e56dba: fix: update postcss
- Updated dependencies [0005443]
- Updated dependencies [7e56dba]
  - cssnano-preset-default@7.0.16

## 7.1.7

### Patch Changes

- fix: publish all dependencies with attestations
- Updated dependencies
  - cssnano-preset-default@7.0.15

## 7.1.6

### Patch Changes

- 322ad33: fix: update postcss peer dependency
- Updated dependencies [322ad33]
  - cssnano-preset-default@7.0.14

## 7.1.5

### Patch Changes

- fix: update dependencies
- Updated dependencies [5cb8b09]
  - cssnano-preset-default@7.0.13

## 7.1.4

### Patch Changes

- fix: improve color conversion precision
- Updated dependencies
  - cssnano-preset-default@7.0.12

## 7.1.3

### Patch Changes

- c3e537a: fix: update postcss-selector-parser
- 5b9af42: fix: update browserslist and autoprefixer
- Updated dependencies [c3e537a]
- Updated dependencies [5b9af42]
  - cssnano-preset-default@7.0.11

## 7.1.2

### Patch Changes

- Updated dependencies
  - cssnano-preset-default@7.0.10

## 7.1.1

### Patch Changes

- fix: do not strip % sign inside linear()
- Updated dependencies
  - cssnano-preset-default@7.0.9

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

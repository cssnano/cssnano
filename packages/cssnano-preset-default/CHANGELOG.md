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

- Stop turning a comment inside a selector into a descendant combinator. A comment is not whitespace, so `div/*c*/span` is not the same selector as `div span`. It now becomes `div/**/span` instead. Comments that can be removed without joining two tokens are still removed, so `.a/*c*/.b` becomes `.a.b`.

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

- Require Browserslist 4.29.3 or later.

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

- Rules with identical selectors now merge without changing which declaration wins the cascade. A rule that repeats a value already overridden inside the earlier rule, or that overrides a later shorthand with a longhand, keeps its declaration instead of being dropped as a duplicate, so the computed styles of merged rules match the original stylesheet.

- Declarations whose standard property names differ only in case, such as `COLOR` and `color`, now merge like identically spelled properties. Custom property names stay case-sensitive, so `--FOO` and `--foo` remain distinct declarations.

- Restricts color minification to CSS properties that accept `<color>` and custom properties, preserving custom identifiers in properties like `animation-name`, `grid-area`, and `counter-reset`. Adds support for `hwb()` color values and minification inside `color-mix()`, `light-dark()`, and `var()` fallbacks, while preserving relative color syntax, math functions, and token boundary separators.

- Preserves zero percentage units in rgb(), rgba(), and modern CSS Color 4 functions to avoid invalid syntax, respects disabled time conversions for 0ms, clamps percentage opacity values adhering to CSS Color 4 alpha semantics, and improves compatibility with uppercase at-rules and vendor-prefixed keyframes.

- Preserves zero length in `columns` shorthands and zero units inside `@property` with `<angle-percentage>` syntax, retaining keyframe percentage units under nested rules. Symmetrically rounds negative numbers when precision is configured, converts between metric units (`mm`, `cm`, `q`), preserves zero percentages on SVG stroke properties to retain transition interpolation, and caches Browserslist lookups across runs. Also preserves units inside CSS Fonts 5 override descriptors, `anchor()` functions, `flex-basis`, and IE-targeted sizing properties.

- Remove comments more reliably and preserve the ones you keep exactly. Comments are now removed from declaration values that carry `!important`, and comment detection respects CSS token boundaries: text inside unquoted `url()` values and behind escape sequences in strings and identifiers is no longer mistaken for a comment. Kept comments are emitted byte-for-byte, including an unclosed comment at the end of a value, and whitespace inside kept comments is left untouched. Removal state is scoped to each document, so a shared processor no longer carries `removeAllButFirst` first-comment state between runs, and the `remove` callback runs once per comment occurrence. A non-function `remove` option now fails with a `TypeError`.

- Folds more selector lists into safe `:is()` expressions when their selectors contain nested comma-separated functions, while preserving selector order and conservative specificity and namespace checks.

- Recognizes `currentColor` and system colours such as `canvas` as colour stops, so their positions are clamped or dropped like any other stop. A stop position at or below the running non-negative maximum is now written as zero even when the two positions use different units, and minifying an already minified gradient no longer changes it again. Single-stop gradients lose positions that spell the default boundaries. Positions are no longer replaced with zero when the largest position is negative.

- Adds the balanced token index used by selector, parameter, and gradient minification while preserving their serialized CSS output.

- Improve conformance for modern CSS math functions, grid-line values, and case-sensitive attribute selector modifiers while preserving ambiguous or invalid declarations. The affected transforms now use bounded, linear scans for these forms.

- Value transforms now read the CSS Values 4 math function names from one `mathFunctions` table in `cssnano-utils`, so unit retention, box and shorthand merging, parameter and whitespace handling, and time classification agree on which functions count as math functions. Serialized output is unchanged.

- Standardize output normalization for margin, padding, and physical border properties. Property names and case-insensitive keywords in generated shorthands and normalized standalone shorthand declarations are canonicalized to lowercase, while preserving author casing for unmerged longhands, custom properties, hack prefixes, and unresolved values.

- Merge rules that use modern pseudo-classes and pseudo-elements — `:modal`, `::file-selector-button`, `:read-only`, `:read-write`, `:autofill`, and `:fullscreen` — when every browser in the target list supports the corresponding feature. Support is still checked per browser, so these selectors remain unmerged under older targets, and pseudos without verified support data such as `:popover-open` and `:user-invalid` continue to block merging.

- perf: median 15% speed increase on test fixtures

- `postcss-normalize-url` now decodes quoted `url(...)` values, preserving literal backslashes and escape sequences whether quotes are stripped or kept.
  Relative URLs now normalize using POSIX path semantics across all platforms, and converted `@namespace` URLs escape double quotes.

- Join every escaped line continuation in a multiline `url()` value into one line, including `\r\n` continuations that previously survived and left an invalid string behind. Rewriting a `@namespace` URL no longer overwrites the tokens that follow it, so trailing text is preserved and multiple URLs in one namespace declaration are each normalized.

- Remove insignificant whitespace around custom-property names and, in standard declarations, around `env()` custom-ident arguments and around comma delimiters in `var()`, `env()`, and `constant()`. Between a custom-property name and its value, only the parser-consumed leading whitespace run is dropped; authored whitespace elsewhere in the value, such as after a preserved comment, is preserved per CSS Variables 1. Required whitespace between distinct tokens and the single whitespace token in an empty fallback remain preserved, and a preserved comment kept between a declaration name and value now survives minification, for custom properties and standard declarations alike. Comment removal in selectors and values no longer fuses the tokens the comment sat between: an attribute case-insensitivity flag or any other name-like token keeps its boundary, and math-operator spacing is restored for every function whose value productions accept `<calc-sum>` arguments (including `calc-size()`, `calc-mix()`, and `random()`). Values without comments are now left byte-for-byte untouched rather than re-spaced.

- Preserve whitespace around division operators across all modern CSS math functions such as `min()`, `max()`, and `clamp()`, and ensure commas in nested calculations have extraneous whitespace trimmed.

- Orders `columns: 2 auto` as `columns: auto 2`. Leaves animation declarations with negative iteration counts unchanged. Reorders border and box-shadow math functions that resolve to a length, such as `calc(1px + 1em)`, and leaves other math unchanged. Passes through unknown box-shadow color functions instead of reordering them.

- Profitable adjacent rule merges are no longer skipped by the legacy look-ahead, and important comments are preserved when equal-declaration rules are merged.

- Normalize CSS string quotes and collapse escaped line continuations.

- Use ASCII case-insensitive matching for CSS names and grammar keywords so Unicode lookalikes are preserved, and restrict CSS whitespace normalization to the CSS whitespace set.

- Only reduce transform functions whose component types match the spec; keep invalid values unchanged. Never merge a `var()` reference with an `env()` reference of the same name.

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

- Updated dependencies:
  - cssnano-utils@8.0.0

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

- fix(cssnano-preset-default): update postcss-calc

## 9.0.1

### Patch Changes

- perf(postcss-minify-selectors): avoid quadratic selector scanning

- pef(stylehacks): avoid rescanning the nodes when checking for compatibility hacks

## 9.0.0

### Major Changes

- The cssnano packages are now native ESM and require Node `^22.22.3 || ^24.15.0 || >=26.0`. Package subpath imports are no longer supported. See the migration documentation before upgrading.

- fix!(cssnano): introduce new postcss-calc plugin

### Patch Changes

- Updated dependencies:
  - cssnano-utils@7.0.0
  - postcss-colormin@9.0.0
  - postcss-convert-values@9.0.0
  - postcss-discard-comments@9.0.0
  - postcss-discard-duplicates@9.0.0
  - postcss-discard-empty@9.0.0
  - postcss-discard-overridden@9.0.0
  - postcss-merge-longhand@9.0.0
  - postcss-merge-rules@9.0.0
  - postcss-minify-font-values@9.0.0
  - postcss-minify-gradients@9.0.0
  - postcss-minify-params@9.0.0
  - postcss-minify-selectors@9.0.0
  - postcss-normalize-charset@9.0.0
  - postcss-normalize-display-values@9.0.0
  - postcss-normalize-positions@9.0.0
  - postcss-normalize-repeat-style@9.0.0
  - postcss-normalize-string@9.0.0
  - postcss-normalize-timing-functions@9.0.0
  - postcss-normalize-unicode@9.0.0
  - postcss-normalize-url@9.0.0
  - postcss-normalize-whitespace@9.0.0
  - postcss-ordered-values@9.0.0
  - postcss-reduce-initial@9.0.0
  - postcss-reduce-transforms@9.0.0
  - postcss-svgo@9.0.0
  - postcss-unique-selectors@9.0.0

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

- perf(postcss-merge-rules): cache negative browser-support results when deciding whether to merge rules

  Checking whether a selector feature is supported by the target browsers previously skipped the cache whenever the feature was not supported, so every occurrence of an unsupported feature re-ran the browserslist/caniuse lookup. This is now cached, which speeds up rule merging.

- fix(postcss-discard-empty): remove empty cascade layers when they do not affect the layer ordering

- fix(postcss-normalize-whitespace): stop dropping the escaped character in a trailing backslash escape

  Keep the whitespace character when a declaration ends in a backslash character followed by a whitespace character and the declaration is the last in its rule, instead of leaving a dangling character and invalid CSS

## 8.0.6

### Patch Changes

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
- Updated dependencies [b245a0b]
- Updated dependencies [3bf3f4d]
- Updated dependencies [7343c87]
- Updated dependencies
  - postcss-discard-overridden@8.0.1
  - postcss-normalize-timing-functions@8.0.1
  - postcss-normalize-display-values@8.0.1
  - postcss-normalize-repeat-style@8.0.1
  - postcss-normalize-whitespace@8.0.1
  - postcss-normalize-positions@8.0.1
  - postcss-discard-duplicates@8.0.1
  - postcss-minify-font-values@8.0.1
  - postcss-normalize-charset@8.0.1
  - postcss-normalize-unicode@8.0.1
  - postcss-reduce-transforms@8.0.1
  - postcss-discard-comments@8.0.1
  - postcss-minify-gradients@8.0.1
  - postcss-minify-selectors@8.0.2
  - postcss-normalize-string@8.0.1
  - postcss-unique-selectors@8.0.1
  - postcss-convert-values@8.0.1
  - postcss-merge-longhand@8.0.1
  - postcss-ordered-values@8.0.1
  - postcss-reduce-initial@8.0.1
  - postcss-discard-empty@8.0.1
  - postcss-minify-params@8.0.1
  - postcss-normalize-url@8.0.1
  - postcss-merge-rules@8.0.1
  - postcss-colormin@8.0.1
  - cssnano-utils@6.0.1
  - postcss-svgo@8.0.1

## 8.0.1

### Patch Changes

- fix(postcss-minify-selectors): avoid folding some selectors incorrectly
- Updated dependencies
  - postcss-minify-selectors@8.0.1

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
  - postcss-normalize-timing-functions@8.0.0
  - postcss-normalize-display-values@8.0.0
  - postcss-normalize-repeat-style@8.0.0
  - postcss-normalize-whitespace@8.0.0
  - postcss-normalize-positions@8.0.0
  - postcss-discard-duplicates@8.0.0
  - postcss-discard-overridden@8.0.0
  - postcss-minify-font-values@8.0.0
  - postcss-normalize-charset@8.0.0
  - postcss-normalize-unicode@8.0.0
  - postcss-reduce-transforms@8.0.0
  - postcss-discard-comments@8.0.0
  - postcss-minify-gradients@8.0.0
  - postcss-minify-selectors@8.0.0
  - postcss-normalize-string@8.0.0
  - postcss-unique-selectors@8.0.0
  - postcss-convert-values@8.0.0
  - postcss-merge-longhand@8.0.0
  - postcss-ordered-values@8.0.0
  - postcss-reduce-initial@8.0.0
  - postcss-discard-empty@8.0.0
  - postcss-minify-params@8.0.0
  - postcss-normalize-url@8.0.0
  - postcss-merge-rules@8.0.0
  - postcss-colormin@8.0.0
  - cssnano-utils@6.0.0
  - postcss-svgo@8.0.0

## 7.0.17

### Patch Changes

- fix(postcss-minify-selectors): do not fold non-standard selectors
- Updated dependencies
  - postcss-minify-selectors@7.1.2

## 7.0.16

### Patch Changes

- 0005443: fix(postcss-minify-selectors): fix wrong behaviour when merging into is()
- 7e56dba: fix: update postcss
- Updated dependencies [0005443]
- Updated dependencies [d1780fd]
- Updated dependencies [7e56dba]
  - postcss-minify-selectors@7.1.1
  - postcss-minify-gradients@7.0.5
  - postcss-colormin@7.0.10
  - postcss-normalize-timing-functions@7.0.3
  - postcss-normalize-display-values@7.0.3
  - postcss-normalize-repeat-style@7.0.4
  - postcss-normalize-whitespace@7.0.3
  - postcss-normalize-positions@7.0.4
  - postcss-discard-duplicates@7.0.4
  - postcss-discard-overridden@7.0.3
  - postcss-minify-font-values@7.0.3
  - postcss-normalize-charset@7.0.3
  - postcss-normalize-unicode@7.0.9
  - postcss-reduce-transforms@7.0.3
  - postcss-discard-comments@7.0.8
  - postcss-normalize-string@7.0.3
  - postcss-unique-selectors@7.0.7
  - postcss-convert-values@7.0.12
  - postcss-merge-longhand@7.0.7
  - postcss-ordered-values@7.0.4
  - postcss-reduce-initial@7.0.9
  - postcss-discard-empty@7.0.3
  - postcss-minify-params@7.0.9
  - postcss-normalize-url@7.0.3
  - postcss-merge-rules@7.0.11
  - cssnano-utils@5.0.3
  - postcss-svgo@7.1.3

## 7.0.15

### Patch Changes

- fix: publish all dependencies with attestations
- Updated dependencies
  - postcss-normalize-positions@7.0.3
  - postcss-normalize-repeat-style@7.0.3

## 7.0.14

### Patch Changes

- 322ad33: fix: update postcss peer dependency
- Updated dependencies [322ad33]
- Updated dependencies [a00036c]
- Updated dependencies [6d5b6cc]
  - postcss-normalize-timing-functions@7.0.2
  - postcss-normalize-display-values@7.0.2
  - postcss-normalize-repeat-style@7.0.2
  - postcss-normalize-whitespace@7.0.2
  - postcss-normalize-positions@7.0.2
  - postcss-discard-duplicates@7.0.3
  - postcss-discard-overridden@7.0.2
  - postcss-minify-font-values@7.0.2
  - postcss-normalize-charset@7.0.2
  - postcss-normalize-unicode@7.0.8
  - postcss-reduce-transforms@7.0.2
  - postcss-discard-comments@7.0.7
  - postcss-minify-gradients@7.0.4
  - postcss-minify-selectors@7.1.0
  - postcss-normalize-string@7.0.2
  - postcss-unique-selectors@7.0.6
  - postcss-convert-values@7.0.11
  - postcss-merge-longhand@7.0.6
  - postcss-ordered-values@7.0.3
  - postcss-reduce-initial@7.0.8
  - postcss-discard-empty@7.0.2
  - postcss-minify-params@7.0.8
  - postcss-normalize-url@7.0.2
  - postcss-merge-rules@7.0.10
  - postcss-colormin@7.0.9
  - cssnano-utils@5.0.2
  - postcss-svgo@7.1.2

## 7.0.13

### Patch Changes

- 5cb8b09: fix: udpate browserslist
- Updated dependencies [5cb8b09]
- Updated dependencies [9e615cc]
  - postcss-normalize-unicode@7.0.7
  - postcss-minify-gradients@7.0.3
  - postcss-convert-values@7.0.10
  - postcss-reduce-initial@7.0.7
  - postcss-minify-params@7.0.7
  - postcss-merge-rules@7.0.9
  - postcss-colormin@7.0.8

## 7.0.12

### Patch Changes

- fix: improve color conversion precision
- Updated dependencies [5f64972]
  - postcss-colormin@7.0.7
  - postcss-minify-gradients@7.0.2

## 7.0.11

### Patch Changes

- c3e537a: fix: update postcss-selector-parser
- 5b9af42: fix: update browserslist and autoprefixer
- Updated dependencies [5674f7a]
- Updated dependencies [c3e537a]
- Updated dependencies [c0053c8]
- Updated dependencies [5b9af42]
  - postcss-svgo@7.1.1
  - postcss-normalize-unicode@7.0.6
  - postcss-discard-comments@7.0.6
  - postcss-minify-selectors@7.0.6
  - postcss-unique-selectors@7.0.5
  - postcss-convert-values@7.0.9
  - postcss-reduce-initial@7.0.6
  - postcss-minify-params@7.0.6
  - postcss-merge-rules@7.0.8
  - postcss-colormin@7.0.6

## 7.0.10

### Patch Changes

- 72dd9c9: fix: update browserslist
- db8e1ee: fix: update browserslist
- Updated dependencies [f31273c]
- Updated dependencies [72dd9c9]
- Updated dependencies [db8e1ee]
  - postcss-discard-comments@7.0.5
  - postcss-normalize-unicode@7.0.5
  - postcss-convert-values@7.0.8
  - postcss-reduce-initial@7.0.5
  - postcss-minify-params@7.0.5
  - postcss-merge-rules@7.0.7
  - postcss-colormin@7.0.5

## 7.0.9

### Patch Changes

- fix: do not strip % sign inside linear()
- Updated dependencies
  - postcss-convert-values@7.0.7

## 7.0.8

### Patch Changes

- 906a785: fix: update browserslist
- Updated dependencies [98dd8f6]
- Updated dependencies [906a785]
  - postcss-svgo@7.1.0
  - postcss-normalize-unicode@7.0.4
  - postcss-convert-values@7.0.6
  - postcss-reduce-initial@7.0.4
  - postcss-minify-params@7.0.4
  - postcss-merge-rules@7.0.6
  - postcss-colormin@7.0.4

## 7.0.7

### Patch Changes

- 2f03871: fix: update lilconfig and browserslist
- 171b669: chore: update dependencies to latest minor version
- 20f4eb6: fix: update browserslist
- 5672148: fix: update PostCSS peer dependency to version without vulnerabilities
- Updated dependencies [2f03871]
- Updated dependencies [171b669]
- Updated dependencies [4772407]
- Updated dependencies [e09cf7e]
- Updated dependencies
- Updated dependencies [20f4eb6]
- Updated dependencies [5672148]
  - postcss-discard-duplicates@7.0.2
  - postcss-normalize-unicode@7.0.3
  - postcss-convert-values@7.0.5
  - postcss-reduce-initial@7.0.3
  - postcss-minify-params@7.0.3
  - postcss-merge-rules@7.0.5
  - postcss-colormin@7.0.3
  - postcss-discard-comments@7.0.4
  - postcss-minify-selectors@7.0.5
  - postcss-unique-selectors@7.0.4
  - postcss-merge-longhand@7.0.5
  - postcss-normalize-timing-functions@7.0.1
  - postcss-normalize-display-values@7.0.1
  - postcss-normalize-repeat-style@7.0.1
  - postcss-normalize-whitespace@7.0.1
  - postcss-normalize-positions@7.0.1
  - postcss-discard-overridden@7.0.1
  - postcss-minify-font-values@7.0.1
  - postcss-normalize-charset@7.0.1
  - postcss-reduce-transforms@7.0.1
  - postcss-minify-gradients@7.0.1
  - postcss-normalize-string@7.0.1
  - postcss-ordered-values@7.0.2
  - postcss-discard-empty@7.0.1
  - postcss-normalize-url@7.0.1
  - cssnano-utils@5.0.1
  - postcss-svgo@7.0.2

## 7.0.6

### Patch Changes

- 024ddef: fix(cssnano-preset-default): update postcss-calc
- 1d65a10: fix: update postcss-selector-parser
- Updated dependencies [34bdcb8]
- Updated dependencies [1d65a10]
  - postcss-convert-values@7.0.4
  - postcss-discard-comments@7.0.3
  - postcss-minify-selectors@7.0.4
  - postcss-unique-selectors@7.0.3
  - postcss-merge-rules@7.0.4
  - postcss-merge-longhand@7.0.4

## 7.0.5

### Patch Changes

- dff5c42: chore: update browserslist and postcss-selector-parser
- f14a898: chore: update all dependencies
- Updated dependencies [dff5c42]
- Updated dependencies [f14a898]
- Updated dependencies [314868b]
  - postcss-normalize-unicode@7.0.2
  - postcss-discard-comments@7.0.2
  - postcss-minify-selectors@7.0.3
  - postcss-unique-selectors@7.0.2
  - postcss-convert-values@7.0.3
  - postcss-reduce-initial@7.0.2
  - postcss-minify-params@7.0.2
  - postcss-merge-rules@7.0.3
  - postcss-colormin@7.0.2
  - postcss-discard-duplicates@7.0.1
  - postcss-merge-longhand@7.0.3

## 7.0.4

### Patch Changes

- Updated dependencies [d6f9a32]
  - postcss-convert-values@7.0.2

## 7.0.3

### Patch Changes

- 0c85fa9: fix: update Browserslist version
- 13fb841: fix(cssnano-preset-default): preserve title in SVG
- 08989b0: fix(cssnano-preset-default): preserve SVG viewbox by default
- Updated dependencies [9e8606a]
- Updated dependencies [c192461]
- Updated dependencies [0c85fa9]
- Updated dependencies [30981b7]
  - postcss-discard-comments@7.0.1
  - postcss-minify-selectors@7.0.2
  - postcss-ordered-values@7.0.1
  - postcss-normalize-unicode@7.0.1
  - postcss-convert-values@7.0.1
  - postcss-reduce-initial@7.0.1
  - postcss-minify-params@7.0.1
  - postcss-merge-rules@7.0.2
  - postcss-colormin@7.0.1
  - postcss-merge-longhand@7.0.2

## 7.0.2

### Patch Changes

- Updated dependencies [c14b9f5]
- Updated dependencies [759e16e]
  - postcss-minify-selectors@7.0.1
  - postcss-unique-selectors@7.0.1
  - postcss-merge-rules@7.0.1
  - postcss-svgo@7.0.1
  - postcss-merge-longhand@7.0.1

## 7.0.1

### Patch Changes

- 2a26e29: chore: update postcss-calc to latest release

## 7.0.0

### Major Changes

- 0d10597: chore: drop support for Node.js 14 and 16

### Patch Changes

- Updated dependencies [0d10597]
  - postcss-normalize-timing-functions@7.0.0
  - postcss-normalize-display-values@7.0.0
  - postcss-normalize-repeat-style@7.0.0
  - postcss-normalize-whitespace@7.0.0
  - postcss-normalize-positions@7.0.0
  - postcss-discard-duplicates@7.0.0
  - postcss-discard-overridden@7.0.0
  - postcss-minify-font-values@7.0.0
  - postcss-normalize-charset@7.0.0
  - postcss-normalize-unicode@7.0.0
  - postcss-reduce-transforms@7.0.0
  - postcss-discard-comments@7.0.0
  - postcss-minify-gradients@7.0.0
  - postcss-minify-selectors@7.0.0
  - postcss-normalize-string@7.0.0
  - postcss-unique-selectors@7.0.0
  - postcss-convert-values@7.0.0
  - postcss-merge-longhand@7.0.0
  - postcss-ordered-values@7.0.0
  - postcss-reduce-initial@7.0.0
  - postcss-discard-empty@7.0.0
  - postcss-minify-params@7.0.0
  - postcss-normalize-url@7.0.0
  - postcss-merge-rules@7.0.0
  - postcss-colormin@7.0.0
  - cssnano-utils@5.0.0
  - postcss-svgo@7.0.0

## 6.1.2

### Patch Changes

- fix(cssnano-preset-default): update css-declaration-sorter

## 6.1.1

### Patch Changes

- Updated dependencies [0856f86]
- Updated dependencies [794dc6c]
  - postcss-minify-selectors@6.0.4
  - postcss-unique-selectors@6.0.4
  - postcss-merge-rules@6.1.1
  - postcss-minify-font-values@6.1.0
  - postcss-merge-longhand@6.0.5

## 6.1.0

### Minor Changes

- feat: add preset and plugin options for browserslist

### Patch Changes

- enable “go to definition” via declaration maps
- fix: add missing type declarations to plugins with options
- Updated dependencies
  - postcss-colormin@6.1.0
  - postcss-convert-values@6.1.0
  - postcss-merge-rules@6.1.0
  - postcss-minify-params@6.1.0
  - postcss-normalize-unicode@6.1.0
  - postcss-reduce-initial@6.1.0
  - cssnano-utils@4.0.2
  - postcss-discard-comments@6.0.2
  - postcss-discard-duplicates@6.0.3
  - postcss-discard-empty@6.0.3
  - postcss-discard-overridden@6.0.2
  - postcss-merge-longhand@6.0.4
  - postcss-minify-font-values@6.0.3
  - postcss-minify-gradients@6.0.3
  - postcss-minify-selectors@6.0.3
  - postcss-normalize-charset@6.0.2
  - postcss-normalize-display-values@6.0.2
  - postcss-normalize-positions@6.0.2
  - postcss-normalize-repeat-style@6.0.2
  - postcss-normalize-string@6.0.2
  - postcss-normalize-timing-functions@6.0.2
  - postcss-normalize-url@6.0.2
  - postcss-normalize-whitespace@6.0.2
  - postcss-ordered-values@6.0.2
  - postcss-reduce-transforms@6.0.2
  - postcss-svgo@6.0.3
  - postcss-unique-selectors@6.0.3

## 6.0.5

### Patch Changes

- Updated dependencies [c2160e3]
- Updated dependencies [83d3268]
- Updated dependencies [f461389]
- Updated dependencies [c4be0f5]
  - postcss-minify-font-values@6.0.2
  - postcss-normalize-unicode@6.0.3
  - postcss-convert-values@6.0.4
  - postcss-reduce-initial@6.0.3
  - postcss-minify-params@6.0.3
  - postcss-merge-rules@6.0.4
  - postcss-colormin@6.0.3
  - postcss-minify-gradients@6.0.2
  - postcss-merge-longhand@6.0.3

## 6.0.4

### Patch Changes

- Updated dependencies [4bf74ef]
- Updated dependencies [52d14d8]
- Updated dependencies [3757056]
  - postcss-discard-empty@6.0.2
  - postcss-discard-duplicates@6.0.2
  - postcss-convert-values@6.0.3

## 6.0.3

### Patch Changes

- 9c6b0bc: fix(cssnano-preset-default): do not sort unknown properties
- Updated dependencies [f233b22]
- Updated dependencies [26bbbd3]
- Updated dependencies [26bbbd3]
- Updated dependencies [b1aea33]
- Updated dependencies [43d6898]
- Updated dependencies [1ead72d]
- Updated dependencies [42249e7]
  - postcss-minify-selectors@6.0.2
  - postcss-unique-selectors@6.0.2
  - postcss-merge-rules@6.0.3
  - postcss-normalize-unicode@6.0.2
  - postcss-convert-values@6.0.2
  - postcss-reduce-initial@6.0.2
  - postcss-minify-params@6.0.2
  - postcss-colormin@6.0.2
  - postcss-svgo@6.0.2
  - postcss-merge-longhand@6.0.2

## 6.0.2

### Patch Changes

- 18331a6: fix: update cssnano peer dependency to 8.4.31 to avoid security issue
- 18331a6: fix: update postcss-calc to 9.0.1 to solve disappearing expressions inside two brackets
- 18331a6: deps(postcss-svgo): update SVGO to 3.0.5 and update doc
- 18331a6: chore: update css-declaration-sorter
- 18331a6: fix(postcss-minify-selectors): prevent mangling of timeline range names
- 18331a6: fix(postcss-convert-values): keep percent unit in @Property
- Updated dependencies [18331a6]
  - cssnano-utils@4.0.1
  - postcss-colormin@6.0.1
  - postcss-convert-values@6.0.1
  - postcss-discard-comments@6.0.1
  - postcss-discard-duplicates@6.0.1
  - postcss-discard-empty@6.0.1
  - postcss-discard-overridden@6.0.1
  - postcss-merge-longhand@6.0.1
  - postcss-merge-rules@6.0.2
  - postcss-minify-font-values@6.0.1
  - postcss-minify-gradients@6.0.1
  - postcss-minify-params@6.0.1
  - postcss-minify-selectors@6.0.1
  - postcss-normalize-charset@6.0.1
  - postcss-normalize-display-values@6.0.1
  - postcss-normalize-positions@6.0.1
  - postcss-normalize-repeat-style@6.0.1
  - postcss-normalize-string@6.0.1
  - postcss-normalize-timing-functions@6.0.1
  - postcss-normalize-unicode@6.0.1
  - postcss-normalize-url@6.0.1
  - postcss-normalize-whitespace@6.0.1
  - postcss-ordered-values@6.0.1
  - postcss-reduce-initial@6.0.1
  - postcss-reduce-transforms@6.0.1
  - postcss-svgo@6.0.1
  - postcss-unique-selectors@6.0.1

## 6.0.1

### Patch Changes

- chore: updage postcss-calc to version 9
- fix(postcss-merge-rules): do not merge nested rules
- Updated dependencies
  - postcss-merge-rules@6.0.1

## 6.0.0

### Major Changes

- ca9d3f55: chore: bump node versions for packages depending on svgo
- ca9d3f55: Switch minimum supported Node version to 14 for all packages

### Patch Changes

- Updated dependencies
- Updated dependencies [4e272f88]
- Updated dependencies [ca9d3f55]
- Updated dependencies [99d1e6ab]
  - postcss-reduce-initial@6.0.0
  - postcss-svgo@6.0.0
  - postcss-normalize-timing-functions@6.0.0
  - postcss-normalize-display-values@6.0.0
  - postcss-normalize-repeat-style@6.0.0
  - postcss-normalize-whitespace@6.0.0
  - postcss-normalize-positions@6.0.0
  - postcss-discard-duplicates@6.0.0
  - postcss-discard-overridden@6.0.0
  - postcss-minify-font-values@6.0.0
  - postcss-normalize-charset@6.0.0
  - postcss-normalize-unicode@6.0.0
  - postcss-reduce-transforms@6.0.0
  - postcss-discard-comments@6.0.0
  - postcss-minify-gradients@6.0.0
  - postcss-minify-selectors@6.0.0
  - postcss-normalize-string@6.0.0
  - postcss-unique-selectors@6.0.0
  - postcss-convert-values@6.0.0
  - postcss-merge-longhand@6.0.0
  - postcss-ordered-values@6.0.0
  - postcss-discard-empty@6.0.0
  - postcss-minify-params@6.0.0
  - postcss-normalize-url@6.0.0
  - postcss-merge-rules@6.0.0
  - postcss-colormin@6.0.0
  - cssnano-utils@4.0.0

## 5.2.14

### Patch Changes

- fix(postcsss-reduce-initial): fix mask-repeat conversion
  fix(postcss-colormin): don't minify colors in src declarations
  fix(postcss-merge-rules): do not merge conflicting flex and border properties
- Updated dependencies
  - postcss-colormin@5.3.1
  - postcss-merge-rules@5.1.4
  - postcss-reduce-initial@5.1.2

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

# cssnano-utils

Utility methods and plugins for cssnano projects.

## API

### PostCSS Utilities

| Utility | Description |
| --- | --- |
| `rawCache` | PostCSS plugin that sets default formatting for generated AST nodes on `result.root.rawCache`. |
| `isAnonymousLayer` | Whether an `@layer` at-rule has no layer name, so each block is a distinct layer. |
| `isImportantComment` | Whether comment text (without delimiters) starts with `!`, the convention for licenses and notices that minifiers keep. |

### CSS Tokenizer and Value Utilities

| Utility | Description |
| --- | --- |
| `TokenType` | Re-exported `TokenType` enum from `@csstools/css-tokenizer`. |
| `tokens` | Tokenize a CSS string into a `CSSToken[]` array with trailing `EOF` tokens stripped. |
| `tokenStart` | Return the inclusive start character offset of a token (`token[2]`). |
| `tokenEnd` | Return the exclusive end character offset of a token (`token[3] + 1`) for string slicing. |
| `closeForOpening` | Return the closing token type for an opening `Function`, `(`, `[` or `{` token type, or `undefined`. |
| `decoded` | Return the decoded string value of a token, falling back to its raw representation. |
| `numeric` | Parse a single token into `{ number, unit }`, or `false` if not a numeric token. |
| `asciiLowerCase` | ASCII-lowercase a string, as CSS keyword matching requires, without Unicode case folding. |
| `endsWithEscapingBackslash` | Whether a string ends in an odd run of backslashes, so the last one escapes whatever follows. |
| `isHexDigitCode` | Whether a UTF-16 code unit is an ASCII hex digit (`0-9`, `a-f`, `A-F`). |
| `mathFunctions` | Read-only `Map` from each CSS Values 4 math function name to its `[min, max]` inclusive argument count (`max` may be `Infinity`). Iterating yields `[name, range]` pairs; use `.keys()` for names. |
| `calcSumFunctions` | `Set` of CSS Values 5 functions beyond the math functions whose arguments are `<calc-sum>`s (`calc-mix()`, `calc-size()`, `progress()`, `random()`, ...). |
| `lengthUnits` | `Set` of CSS Values 4 length units, lowercase. |
| `balancedTokens` | Parse CSS into a `BalancedTokens` index of matching delimiters (`()`, `[]`, `{}`), or `undefined` if unbalanced. |
| `applyEdits` | Apply validated, non-overlapping string edits. Invalid bounds or overlaps fail closed by returning the complete original source. |

### Browser Targets

Every plugin that depends on browser support reads its targets from one
resolver, so all plugins of a preset judge a file against the same browsers.
The preset passes its own target options to each of these plugins and ignores
target options given to a single plugin.
The checks take the resolved targets unchanged and never resolve queries
themselves.

| Export | Description |
| --- | --- |
| `#utils/browser-targets` `resolveTargets` | Resolves a plugin's browserslist targets once per file. |
| `#utils/browser-targets` `defaultTargetsQuery` | The query used when the user states no preference: `baseline widely available with downstream`. It is counted back from the current date, so the targets it resolves move forward over time. |
| `#utils/browser-support` `supportsAll(targets, feature)` | Whether every target supports a caniuse feature. |
| `#utils/browser-bugs` `anyAffected(targets, bug)` | Whether at least one target has a browser bug listed in `bugs.json`. |
| `#utils/versions` `compareVersions(left, right)` | Orders dotted release numbers numerically per component, so `10.1` follows `9.3`. |
| `#utils/versions` `isDottedVersion(version)` | Whether a string is a dotted numeric release, rejecting words such as `TP` and ranges. |

The targets come from the first of these that is set:

1. the `overrideBrowserslist` option;
2. the project's browserslist config, or the `BROWSERSLIST` environment
   variable, found as browserslist finds it;
3. `defaultTargetsQuery`, instead of browserslist's own `defaults`.

A query that matches no browser resolves to an empty list and adds a PostCSS
warning, so the optimizations that depend on browser support stay off.

Unknown engines follow one policy in each check:

- **Feature checks:** an entry that caniuse-lite does not list counts as
  unsupported, so newer syntax is not emitted for it. An empty list is
  unsupported too.
- **Bug checks:** an entry is affected only when `bugs.json` lists it, so an
  unknown engine counts as unaffected. An empty list counts as affected by
  every bug, because its targets are unknown.

Support follows caniuse's status: `y` is supported, and so are notes such as
`y #2`. `y x` (needs a vendor prefix), `a` (partial), `u` and `n` are not.
Only the caniuse features that the plugins check are imported, rather than
the whole caniuse database. The same support checks run in Node and in the
browser.

The resolved target lists are frozen copies, shared by every plugin that
resolves the same query for a file, so a plugin cannot change one. A `stats`
object is cached by identity, so pass a new object instead of changing one
between runs.

A browser version that cssnano's copy of caniuse-lite does not list adds a
PostCSS warning, because it counts as unsupported for every feature check.
Targets older than IE 11 get the output written for IE 11, without a warning.

The search for a browserslist config starts at `path`, then at `from` or
`file`, and at the working directory when none is set. The directory of the
plugin package has no influence. In a browser there is no config to find, so
the targets are the override or the default. The playground on the
documentation site is the exception: it uses the default targets resolved
when the site was built, whatever the options.

### `BalancedTokens` Methods

Instances returned by `balancedTokens(source)` provide:

- `endForOpening(index)`: Returns the closing token index for an opening delimiter token at `index`.
- `topLevelSegments(startIndex?, endIndex?, delimiter?)`: Splits a balanced token range by a top-level delimiter (defaults to comma).

## Usage

```js
import cssnanoUtils from 'cssnano-utils';

const { tokens, balancedTokens, applyEdits } = cssnanoUtils;

const structure = balancedTokens('cubic-bezier(0.1, 0.7, 1.0, 0.1)');
if (structure) {
  const segments = structure.topLevelSegments();
  // Process balanced segments
}
```

## Contributors

See [CONTRIBUTORS.md](https://github.com/cssnano/cssnano/blob/main/CONTRIBUTORS.md).

## License

MIT

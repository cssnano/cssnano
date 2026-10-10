# cssnano-utils

Utility methods and plugins for cssnano projects.

## API

### PostCSS Utilities

| Utility | Description |
| --- | --- |
| `rawCache` | PostCSS plugin that sets default formatting for generated AST nodes on `result.root.rawCache`. |

### CSS Tokenizer and Value Utilities

| Utility | Description |
| --- | --- |
| `TokenType` | Re-exported `TokenType` enum from `@csstools/css-tokenizer`. |
| `tokens` | Tokenize a CSS string into a `CSSToken[]` array with trailing `EOF` tokens stripped. |
| `tokenStart` | Return the inclusive start character offset of a token (`token[2]`). |
| `tokenEnd` | Return the exclusive end character offset of a token (`token[3] + 1`) for string slicing. |
| `decoded` | Return the decoded string value of a token, falling back to its raw representation. |
| `numeric` | Parse a single token into `{ number, unit }`, or `false` if not a numeric token. |
| `endsWithEscapingBackslash` | Whether a string ends in an odd run of backslashes, so the last one escapes whatever follows. |
| `isHexDigitCode` | Whether a UTF-16 code unit is an ASCII hex digit (`0-9`, `a-f`, `A-F`). |
| `mathFunctions` | Read-only `Map` from each CSS Values 4 math function name to its `[min, max]` inclusive argument count (`max` may be `Infinity`). Iterating yields `[name, range]` pairs; use `.keys()` for names. |
| `balancedTokens` | Parse CSS into a `BalancedTokens` index of matching delimiters (`()`, `[]`, `{}`), or `undefined` if unbalanced. |
| `applyEdits` | Apply validated, non-overlapping string edits. Invalid bounds or overlaps fail closed by returning the complete original source. |

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

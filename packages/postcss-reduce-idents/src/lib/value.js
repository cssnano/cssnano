import cssnanoUtils from 'cssnano-utils';

const { TokenType } = cssnanoUtils;

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @type {(value: string) => CSSToken[]} */
const sharedTokens = cssnanoUtils.tokens;
/**
 * @param {CSSToken} token
 * @param {Map<string, number[]>} functions
 * @param {{arguments?: number[], index: number, close: string}[]} stack
 * @return {boolean}
 */
function isFunctionArgument(token, functions, stack) {
  const type = token[0];
  const frame = stack.at(-1);
  if (type === TokenType.Function) {
    stack.push({
      arguments: functions.get(token[1].slice(0, -1).toLowerCase()),
      index: 0,
      close: TokenType.CloseParen,
    });
  } else if (type === TokenType.OpenParen) {
    stack.push({ index: 0, close: TokenType.CloseParen });
  } else if (type === TokenType.OpenSquare) {
    stack.push({ index: 0, close: TokenType.CloseSquare });
  } else if (type === TokenType.OpenCurly) {
    stack.push({ index: 0, close: TokenType.CloseCurly });
  } else if (type === frame?.close) {
    stack.pop();
  } else if (type === TokenType.Comma && frame) {
    frame.index++;
  } else if (type === TokenType.Ident) {
    return frame?.arguments?.includes(frame.index) ?? false;
  }
  return false;
}

/**
 * @param {string} value
 * @param {(token: CSSToken, isFunctionArgument: boolean) => string|undefined} callback
 * @param {Map<string, number[]>} [functions]
 * @param {CSSToken[]} [parsedTokens]
 * @return {string}
 */
function rewrite(
  value,
  callback,
  functions,
  parsedTokens = sharedTokens(value)
) {
  /** @type {{arguments?: number[], index: number, close: string}[]} */
  const stack = [];
  const changes = parsedTokens.flatMap((token) => {
    const isArgument = functions
      ? isFunctionArgument(token, functions, stack)
      : false;
    const text = callback(token, isArgument);
    return text === undefined ? [] : [{ start: token[2], end: token[3], text }];
  });
  if (changes.length === 0) return value;
  const sorted = changes.toSorted((a, b) => a.start - b.start);
  const pieces = [];
  let cursor = 0;
  for (const change of sorted) {
    if (change.start > cursor) {
      pieces.push(value.slice(cursor, change.start));
    }
    pieces.push(change.text);
    cursor = change.end + 1;
  }
  if (cursor < value.length) {
    pieces.push(value.slice(cursor));
  }
  return pieces.join('');
}
export { TokenType, rewrite, sharedTokens as tokens };

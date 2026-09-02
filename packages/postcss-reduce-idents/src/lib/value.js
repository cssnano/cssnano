import { tokenize, TokenType } from '@csstools/css-tokenizer';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @param {string} value @return {CSSToken[]} */
function tokens(value) {
  return [...tokenize({ css: value })].filter(
    (token) => token[0] !== TokenType.EOF
  );
}

/**
 * @param {CSSToken} token
 * @param {Map<string, number[]>} functions
 * @param {{arguments?: number[], index: number, close: TokenType}[]} stack
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
 * @return {string}
 */
function rewrite(value, callback, functions) {
  /** @type {{arguments?: number[], index: number, close: TokenType}[]} */
  const stack = [];
  const changes = tokens(value).flatMap((token) => {
    const isArgument = functions
      ? isFunctionArgument(token, functions, stack)
      : false;
    const text = callback(token, isArgument);
    return text === undefined ? [] : [{ start: token[2], end: token[3], text }];
  });
  let result = value;
  for (const change of changes.toSorted((a, b) => b.start - a.start))
    result =
      result.slice(0, change.start) +
      change.text +
      result.slice(change.end + 1);
  return result;
}
export { TokenType, rewrite, tokens };

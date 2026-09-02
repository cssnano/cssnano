import { tokenize, TokenType } from '@csstools/css-tokenizer';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @param {string} value @return {CSSToken[]} */
function tokens(value) {
  return [...tokenize({ css: value })].filter(
    (token) => token[0] !== TokenType.EOF
  );
}
/** @param {string} value @param {(token: CSSToken) => string|undefined} callback @return {string} */
function rewrite(value, callback) {
  const changes = tokens(value).flatMap((token) => {
    const text = callback(token);
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

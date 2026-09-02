import cssnanoUtils from 'cssnano-utils';
import keywords from './keywords.js';
import minifyFamily from './minify-family.js';
import minifyWeight from './minify-weight.js';

const { TokenType, balancedTokens, decoded } = cssnanoUtils;

/** @param {string} value @param {import('../index.js').Options} opts @return {string} */
// The grammar's mutually exclusive pre-size branches are intentionally kept together.
// eslint-disable-next-line complexity
export default function minifyFont(
  value,
  opts,
  removeQuotes = opts.removeQuotes
) {
  const balanced = balancedTokens(value);
  if (!balanced) return value;
  const input = balanced.tokens;
  let familyStart = -1;
  let possibleFamilyStart = -1;
  let sizeEnd = -1;
  /** @param {number} start @return {number} */
  const skipTrivia = (start) => {
    let index = start;
    while (
      input[index]?.[0] === TokenType.Whitespace ||
      input[index]?.[0] === TokenType.Comment
    )
      index++;
    return index;
  };
  for (let index = 0; index < input.length; index++) {
    const token = input[index];
    if (token[0] === TokenType.Function && /^(var|env)$/i.test(decoded(token)))
      return value;
    if (sizeEnd >= 0) continue;
    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment)
      continue;
    const name =
      token[0] === TokenType.Ident ? decoded(token).toLowerCase() : '';
    if (
      token[0] === TokenType.Ident &&
      (keywords.style.has(name) ||
        keywords.variant.has(name) ||
        keywords.stretch.has(name) ||
        keywords.weight.has(name))
    ) {
      const next = skipTrivia(index + 1);
      possibleFamilyStart = input[next]?.[2] ?? -1;
      continue;
    }
    const isWeight =
      token[0] === TokenType.Number &&
      Number(decoded(token)) >= 1 &&
      Number(decoded(token)) <= 1000;
    if (isWeight) {
      possibleFamilyStart = input[skipTrivia(index + 1)]?.[2] ?? -1;
      continue;
    }
    const isSize =
      (token[0] === TokenType.Ident && keywords.size.has(name)) ||
      (token[0] === TokenType.Number && Number(decoded(token)) === 0) ||
      token[0] === TokenType.Percentage ||
      (token[0] === TokenType.Dimension &&
        !/(deg|grad|rad|turn)$/i.test(token[4].unit)) ||
      token[0] === TokenType.Function;
    if (!isSize) continue;
    if (sizeEnd < 0) sizeEnd = balanced.endForOpening(index) ?? index;
  }
  if (sizeEnd >= 0) {
    let next = skipTrivia(sizeEnd + 1);
    if (input[next]?.[0] === TokenType.Delim && input[next][1] === '/') {
      next = skipTrivia(next + 1);
      if (input[next]) next = (balanced.endForOpening(next) ?? next) + 1;
      next = skipTrivia(next);
    }
    familyStart = input[next]?.[2] ?? value.length;
  }
  if (familyStart < 0) familyStart = possibleFamilyStart;
  if (familyStart < 0) return value;
  let prefix = value
    .slice(0, familyStart)
    .replace(/\bbold\b/gi, (word) => minifyWeight(word.toLowerCase()));
  if (familyStart < value.length && !prefix.endsWith(' ') && prefix)
    prefix += ' ';
  return prefix + minifyFamily(value.slice(familyStart), opts, removeQuotes);
}

import cssnanoUtils from 'cssnano-utils';
import keywords from './keywords.js';
import minifyFamily from './minify-family.js';
import minifyWeight from './minify-weight.js';

const { TokenType, tokens } = cssnanoUtils;

/** @param {string} value @param {import('../index.js').Options} opts @return {string} */
// The grammar's mutually exclusive pre-size branches are intentionally kept together.
// eslint-disable-next-line complexity
export default function minifyFont(value, opts) {
  const input = tokens(value);
  let familyStart = -1;
  let possibleFamilyStart = -1;
  let hasSize = false;
  for (const [index, token] of input.entries()) {
    if (token[0] === TokenType.Ident) {
      const name = token[4].value.toLowerCase();
      if (
        !hasSize &&
        (keywords.style.has(name) ||
          keywords.variant.has(name) ||
          keywords.stretch.has(name) ||
          keywords.weight.has(name))
      ) {
        let next = index + 1;
        while (input[next]?.[0] === TokenType.Whitespace) next++;
        possibleFamilyStart = input[next]?.[2] ?? value.length;
        continue;
      } else if (!hasSize && keywords.size.has(name)) hasSize = true;
    }
    if (
      !hasSize &&
      (token[0] === TokenType.Percentage ||
        (token[0] === TokenType.Dimension &&
          !/(deg|grad|rad|turn)$/i.test(token[4].unit)))
    )
      hasSize = true;
    if (hasSize) {
      let next = index + 1;
      while (input[next]?.[0] === TokenType.Whitespace) next++;
      if (input[next]?.[0] === TokenType.Delim && input[next][1] === '/') {
        next++;
        while (input[next]?.[0] === TokenType.Whitespace) next++;
        next++;
        while (input[next]?.[0] === TokenType.Whitespace) next++;
      }
      familyStart = input[next]?.[2] ?? value.length;
      break;
    }
    if (
      token[0] === TokenType.Function &&
      input[index + 1]?.[0] === TokenType.Whitespace
    ) {
      familyStart = token[2];
      break;
    }
  }
  if (familyStart < 0) familyStart = possibleFamilyStart;
  if (familyStart < 0) return value;
  let prefix = value
    .slice(0, familyStart)
    .replace(/\bbold\b/gi, (word) => minifyWeight(word.toLowerCase()));
  if (!prefix.endsWith(' ') && prefix) prefix += ' ';
  return prefix + minifyFamily(value.slice(familyStart), opts);
}

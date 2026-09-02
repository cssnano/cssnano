import { tokenize, TokenType } from '@csstools/css-tokenizer';

/** @import {CSSToken, TokenFunction} from '@csstools/css-tokenizer' */
const animationTransitionRegex =
  /^(?:-\w+-)?(?:animation|transition)(?:-timing-function)?$/i;

/* Works because toString() normalizes the formatting,
   so comparing the string forms behaves the same as number equality*/
const conversions = new Map([
  [[0.25, 0.1, 0.25, 1].toString(), 'ease'],
  [[0, 0, 1, 1].toString(), 'linear'],
  [[0.42, 0, 1, 1].toString(), 'ease-in'],
  [[0, 0, 0.58, 1].toString(), 'ease-out'],
  [[0.42, 0, 0.58, 1].toString(), 'ease-in-out'],
]);
/** @param {CSSToken[]} tokens @param {number} start @param {number} end @return {CSSToken[][] | undefined} */
function functionParts(tokens, start, end) {
  /** @type {CSSToken[][]} */ const parts = [[]];
  for (let i = start + 1; i < end; i++) {
    const token = tokens[i];
    if (token[0] === TokenType.Comma) parts.push([]);
    else {
      /** @type {CSSToken[]} */ (parts.at(-1)).push(token);
      if (
        token[0] === TokenType.Comment ||
        token[0] === TokenType.Function ||
        token[0] === TokenType.OpenParen
      )
        return undefined;
    }
  }
  return parts;
}

/** @param {string} value @param {CSSToken[][]} parts @return {number[]} */
function partValues(value, parts) {
  return parts.map((part) =>
    Number.parseFloat(
      value.slice(part[0]?.[2] ?? 0, (part.at(-1)?.[3] ?? -1) + 1).trim()
    )
  );
}

/** @param {string} value @param {CSSToken[]} part @return {string} */
function partText(value, part) {
  return value
    .slice(part[0]?.[2] ?? 0, (part.at(-1)?.[3] ?? -1) + 1)
    .trim()
    .toLowerCase();
}

/** @param {string} value @param {CSSToken[]} part @return {string} */
function partSource(value, part) {
  return value.slice(part[0]?.[2] ?? 0, (part.at(-1)?.[3] ?? -1) + 1);
}

/** @param {string} name @param {string} value @param {CSSToken[][]} parts @param {number[]} values @return {string | null} */
function reduceParts(name, value, parts, values) {
  const position = parts.length === 2 ? partText(value, parts[1]) : '';
  if (name === 'steps' && parts.length === 2 && values[0] === 1) {
    if (position === 'start' || position === 'jump-start') return 'step-start';
    if (position === 'end' || position === 'jump-end') return 'step-end';
  }
  if (name === 'steps' && (position === 'end' || position === 'jump-end'))
    return partSource(value, parts[0]);
  if (
    name === 'cubic-bezier' &&
    values.length === 4 &&
    values.every((n) => !Number.isNaN(n))
  )
    return conversions.get(values.toString()) ?? null;
  return null;
}

/** @param {string} value @param {CSSToken[]} tokens @param {TokenFunction} functionToken @param {number} functionIndex @param {number} closeIndex @return {string|null} */
function reduceFunction(
  value,
  tokens,
  functionToken,
  functionIndex,
  closeIndex
) {
  const name = functionToken[1].slice(0, -1).toLowerCase();
  const parts = functionParts(tokens, functionIndex, closeIndex);
  return parts
    ? reduceParts(name, value, parts, partValues(value, parts))
    : null;
}

/**
 * @param {string} value
 * @return {string}
 */
function transform(value) {
  /** @type {CSSToken[]} */
  const tokens = [...tokenize({ css: value })];
  /** @type {[TokenFunction, number][]} */
  const stack = [];
  /** @type {[number, number, string][]} */
  const ranges = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t[0] === TokenType.Function)
      stack.push([/** @type {TokenFunction} */ (t), i]);
    else if (t[0] === TokenType.CloseParen && stack.length) {
      const entry = stack.pop();
      if (!entry) continue;
      const [f] = entry;
      const replacement = reduceFunction(value, tokens, f, entry[1], i);
      if (replacement) ranges.push([f[2], t[3] + 1, replacement]);
    }
  }
  let result = value;
  for (const [a, b, text] of ranges.toSorted((x, y) => y[0] - x[0]))
    result = result.slice(0, a) + text + result.slice(b);
  return result;
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-normalize-timing-functions',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const cache = new Map();

      css.walkDecls(animationTransitionRegex, (decl) => {
        const value = decl.value;

        if (cache.has(value)) {
          decl.value = cache.get(value);

          return;
        }

        const result = transform(value);

        decl.value = result;
        cache.set(value, result);
      });
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

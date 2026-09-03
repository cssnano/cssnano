import { TokenType } from '@csstools/css-tokenizer';
import { isDimension, isFunction, name } from './tokenize.js';

const timeUnits = new Set(['ms', 's']);

/* Names isMath() recognises so the plugin passes theanimation/transition value
through it cannot resolve to a time. Only calc/clamp/max/min are
 actually evaluated below; the rest abort because their units are unknown.
 */
const mathFunctions = new Set([
  'calc',
  'clamp',
  'max',
  'min',
  'round',
  'mod',
  'rem',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'hypot',
  'log',
  'exp',
  'abs',
  'sign',
]);

/**
 * @param {import('@csstools/css-tokenizer').CSSToken[]} tokens
 * @return {string | null}
 */
function parseMath(tokens) {
  const meaningful = tokens.filter(
    (token) => token[0] !== TokenType.Whitespace
  );
  let index = 0;
  /** @return {string | null} */
  const primary = () => {
    const token = meaningful[index++];
    if (!token) return null;
    if (token[0] === TokenType.Number) return 'number';
    if (token[0] === TokenType.Dimension) {
      const unit =
        /** @type {{ unit: string }} */ (token[4]).unit.toLowerCase();
      return timeUnits.has(unit) ? 'time' : `dimension:${unit}`;
    }
    if (token[0] === TokenType.Function) {
      /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
      const nested = [token];
      let depth = 1;
      while (index < meaningful.length && depth) {
        const next = meaningful[index++];
        nested.push(next);
        if (
          next[0] === TokenType.Function ||
          next[0] === TokenType.OpenParen ||
          next[0] === TokenType.OpenSquare ||
          next[0] === TokenType.OpenCurly
        ) {
          depth++;
        } else if (
          next[0] === TokenType.CloseParen ||
          next[0] === TokenType.CloseSquare ||
          next[0] === TokenType.CloseCurly
        ) {
          depth--;
        }
      }
      if (depth) return null;
      return mathType({ raw: '', tokens: nested });
    }
    if (token[0] === TokenType.OpenParen) {
      const result = sum();
      return meaningful[index++]?.[0] === TokenType.CloseParen ? result : null;
    }
    return null;
  };
  /** @return {string | null} */
  const product = () => {
    let left = primary();
    if (left === null) return null;
    while (meaningful[index]?.[1] === '*' || meaningful[index]?.[1] === '/') {
      const operator = meaningful[index++][1];
      const right = primary();
      if (right === null) return null;
      if (operator === '*') {
        if (left === 'number') left = right;
        else if (right !== 'number') return null;
      } else if (right === 'number') {
        continue;
      } else if (left === 'time' && right === 'time') {
        left = 'number';
      } else {
        return null;
      }
    }
    return left;
  };
  /** @return {string | null} */
  function sum() {
    const left = product();
    if (left === null) return null;
    while (meaningful[index]?.[1] === '+' || meaningful[index]?.[1] === '-') {
      index++;
      const right = product();
      if (right === null || right !== left) return null;
    }
    return left;
  }
  const result = sum();
  return result !== null && index === meaningful.length ? result : null;
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} tokens */
function splitMathArguments(tokens) {
  /** @type {import('@csstools/css-tokenizer').CSSToken[][]} */
  const groups = [[]];
  let depth = 0;
  for (const token of tokens) {
    if (
      token[0] === TokenType.Function ||
      token[0] === TokenType.OpenParen ||
      token[0] === TokenType.OpenSquare ||
      token[0] === TokenType.OpenCurly
    )
      depth++;
    if (token[0] === TokenType.Comma && depth === 0) groups.push([]);
    else groups[groups.length - 1].push(token);
    if (
      token[0] === TokenType.CloseParen ||
      token[0] === TokenType.CloseSquare ||
      token[0] === TokenType.CloseCurly
    )
      depth--;
  }
  return groups;
}

/**
 * @param {import('./tokenize.js').Term} node
 * @return {string | null}
 */
function mathType(node) {
  if (!isFunction(node) || !mathFunctions.has(name(node))) return null;
  const inner = node.tokens.slice(1, -1);
  const groups = splitMathArguments(inner);
  const functionName = name(node);
  if (!['calc', 'clamp', 'max', 'min'].includes(functionName)) return null;
  if (functionName === 'calc' && groups.length !== 1) return null;
  if (functionName === 'clamp' && groups.length !== 3) return null;
  if (functionName !== 'calc' && groups.length < 2) return null;
  const types = groups.map(parseMath);
  return types.every((type) => type !== null && type === types[0])
    ? types[0]
    : null;
}

/** @param {import('./tokenize.js').Term} node */
function isMath(node) {
  return isFunction(node) && mathFunctions.has(name(node));
}

/** @param {import('./tokenize.js').Term} node */
export default function isTime(node) {
  if (isDimension(node)) {
    const { unit } = /** @type {{ unit: string }} */ (node.tokens[0][4]);
    return timeUnits.has(unit.toLowerCase());
  }
  return mathType(node) === 'time';
}

export { isMath };

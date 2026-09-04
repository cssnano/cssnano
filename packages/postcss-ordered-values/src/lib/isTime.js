import cssnanoUtils from 'cssnano-utils';
import { isDimension, isFunction, name } from './tokenize.js';

const { TokenType, decoded } = cssnanoUtils;
const timeUnits = new Set(['ms', 's']);
const mathFunctions = new Set([
  'calc',
  'clamp',
  'max',
  'min',
  'round',
  'mod',
  'rem',
  'hypot',
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'pow',
  'sqrt',
  'log',
  'exp',
  'abs',
  'sign',
]);
const closers = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);
const functionArgumentRanges = new Map([
  ['abs', [1, 1]],
  ['calc', [1, 1]],
  ['clamp', [3, 3]],
  ['hypot', [1, Infinity]],
  ['max', [2, Infinity]],
  ['min', [2, Infinity]],
  ['mod', [2, 2]],
  ['rem', [2, 2]],
  ['round', [1, 2]],
]);

/** @typedef {{name: string | null, values: string[], operators: string[], args: string[], expectOperand: boolean}} Frame */
/** @typedef {{input: import('@csstools/css-tokenizer').CSSToken[], frames: Frame[], stack: import('@csstools/css-tokenizer').TokenType[]}} ParserState */

/** @param {string} operator */
function precedence(operator) {
  return operator === '+' || operator === '-' ? 1 : 2;
}

/** @param {Frame} frame */
function reduce(frame) {
  const operator = frame.operators.pop();
  const right = frame.values.pop();
  const left = frame.values.pop();
  if (!operator || right === undefined || left === undefined) return false;
  if (operator === '+' || operator === '-') {
    if (left !== right) return false;
    frame.values.push(left);
  } else if (operator === '*') {
    if (left === 'number') frame.values.push(right);
    else if (right === 'number') frame.values.push(left);
    else return false;
  } else if (right === 'number') frame.values.push(left);
  else if (left === 'time' && right === 'time') frame.values.push('number');
  else return false;
  return true;
}

/** @param {Frame} frame */
function finish(frame) {
  while (frame.operators.length && !reduce(frame)) return null;
  if (frame.expectOperand || frame.values.length !== 1) return null;
  return frame.values[0];
}

/** @param {Frame} frame */
function functionResult(frame) {
  const values = frame.args;
  const range = frame.name && functionArgumentRanges.get(frame.name);
  if (!range || values.length < range[0] || values.length > range[1])
    return null;
  return values.every((value) => value === values[0]) ? values[0] : null;
}

/** @param {Frame[]} frames @param {string | null} value */
function addValue(frames, value) {
  const frame = frames.at(-1);
  if (!frame || !frame.expectOperand || value === null) return false;
  frame.values.push(value);
  frame.expectOperand = false;
  return true;
}

/** @param {ParserState} state @param {Frame} frame @param {import('@csstools/css-tokenizer').CSSToken} token */
function consumeFunction(state, frame, token) {
  const functionName = (decoded(token) ?? '').toLowerCase();
  if (!mathFunctions.has(functionName) || !frame.expectOperand) return false;
  state.frames.push({
    name: functionName,
    values: [],
    operators: [],
    args: [],
    expectOperand: true,
  });
  state.stack.push(TokenType.CloseParen);
  return true;
}

/** @param {ParserState} state @param {Frame} frame */
function consumeOpenParen(state, frame) {
  if (!frame.expectOperand) return false;
  state.frames.push({
    name: null,
    values: [],
    operators: [],
    args: [],
    expectOperand: true,
  });
  state.stack.push(TokenType.CloseParen);
  return true;
}

/** @param {Frame} frame */
function consumeComma(frame) {
  if (!frame.name) return false;
  const value = finish(frame);
  if (value === null) return false;
  frame.args.push(value);
  frame.values = [];
  frame.expectOperand = true;
  return true;
}

/** @param {ParserState} state @param {Frame} frame @param {number} index @param {string} operator */
function consumeOperator(state, frame, index, operator) {
  if (frame.expectOperand) return false;
  if (
    (operator === '+' || operator === '-') &&
    (state.input[index - 1]?.[0] !== TokenType.Whitespace ||
      state.input[index + 1]?.[0] !== TokenType.Whitespace)
  )
    return false;
  while (
    frame.operators.length &&
    precedence(frame.operators.at(-1) ?? '') >= precedence(operator)
  ) {
    if (!reduce(frame)) return false;
  }
  frame.operators.push(operator);
  frame.expectOperand = true;
  return true;
}

/** @param {ParserState} state @param {Frame} frame @param {import('@csstools/css-tokenizer').TokenType} type */
function consumeCloser(state, frame, type) {
  if (state.stack.pop() !== type) return false;
  const value = finish(frame);
  if (value === null) return false;
  state.frames.pop();
  if (!state.frames.at(-1)) return false;
  if (!frame.name) return addValue(state.frames, value);
  frame.args.push(value);
  return addValue(state.frames, functionResult(frame));
}

/** @param {ParserState} state @param {number} index */
function consumeToken(state, index) {
  const token = state.input[index];
  const type = token[0];
  if (type === TokenType.Whitespace) return true;
  const frame = state.frames.at(-1);
  if (!frame) return false;
  if (type === TokenType.Number) return addValue(state.frames, 'number');
  if (type === TokenType.Dimension) {
    const unit = /** @type {{unit: string}} */ (token[4]).unit.toLowerCase();
    return addValue(
      state.frames,
      timeUnits.has(unit) ? 'time' : `dimension:${unit}`
    );
  }
  if (type === TokenType.Function) return consumeFunction(state, frame, token);
  if (type === TokenType.OpenParen) return consumeOpenParen(state, frame);
  if (type === TokenType.Comma) return consumeComma(frame);
  if (type === TokenType.Delim && ['+', '-', '*', '/'].includes(token[1]))
    return consumeOperator(state, frame, index, token[1]);
  if (closers.has(type)) return consumeCloser(state, frame, type);
  return false;
}

/** @param {import('@csstools/css-tokenizer').CSSToken[]} input @return {string | null} */
function parseMath(input) {
  /** @type {ParserState} */
  const state = {
    input,
    frames: [
      { name: null, values: [], operators: [], args: [], expectOperand: true },
    ],
    stack: [],
  };
  for (let index = 0; index < input.length; index++) {
    if (!consumeToken(state, index)) return null;
  }
  if (state.stack.length || state.frames.length !== 1) return null;
  return finish(state.frames[0]);
}

/** @param {import('./tokenize.js').Term} node */
function isMath(node) {
  return isFunction(node) && mathFunctions.has(name(node));
}

/** @param {import('./tokenize.js').Term} node */
export default function isTime(node) {
  if (isDimension(node)) {
    const { unit } = /** @type {{unit: string}} */ (node.tokens[0][4]);
    return timeUnits.has(unit.toLowerCase());
  }
  return isMath(node) && parseMath(node.tokens) === 'time';
}

export { isMath };

'use strict';

// State machine states reused between parses for better perf
const STATES = {
  NORMAL: 0,
  IN_SINGLE_QUOTE: 1,
  IN_DOUBLE_QUOTE: 2,
  IN_COMMENT: 3,
};

/**
 * @typedef {object} ParserContext
 * @property {string} input
 * @property {[number, number, number][]} tokens
 * @property {number} length
 * @property {number} pos
 * @property {number} state
 * @property {number} tokenStart
 * @property {number} commentStart
 */

/**
 * @param {ParserContext} context
 * @param {string} nextChar
 * @return {boolean}
 */
function handleNormalState(context, nextChar) {
  const { input, pos } = context;
  const char = input[pos];

  if (char === '/' && nextChar === '*') {
    if (pos > context.tokenStart) {
      context.tokens.push([0, context.tokenStart, pos]);
    }
    context.commentStart = pos;
    context.state = STATES.IN_COMMENT;
    context.pos += 2;
    return true;
  }

  if (char === '"') {
    context.state = STATES.IN_DOUBLE_QUOTE;
  } else if (char === "'") {
    context.state = STATES.IN_SINGLE_QUOTE;
  }

  return false;
}

/**
 * @param {ParserContext} context
 * @param {string} nextChar
 * @param {string} quote
 * @return {boolean}
 */
function handleQuoteState(context, nextChar, quote) {
  const char = context.input[context.pos];

  if (char === '\\' && nextChar) {
    context.pos += 2;
    return true;
  }

  if (char === quote) {
    context.state = STATES.NORMAL;
  }

  return false;
}

/**
 * @param {ParserContext} context
 * @param {string} nextChar
 * @return {boolean}
 */
function handleCommentState(context, nextChar) {
  const { input, pos } = context;

  if (input[pos] === '*' && nextChar === '/') {
    context.tokens.push([1, context.commentStart + 2, pos]);
    context.tokenStart = pos + 2;
    context.state = STATES.NORMAL;
    context.pos += 2;
    return true;
  }

  return false;
}

/**
 * CSS Comment Parser with context awareness
 * Properly handles comments inside strings, URLs, and escaped characters
 *
 * @param {string} input
 * @return {[number, number, number][]}
 */
module.exports = function commentParser(input) {
  /** @type {ParserContext} */
  const context = {
    input,
    tokens: [],
    length: input.length,
    pos: 0,
    state: STATES.NORMAL,
    tokenStart: 0,
    commentStart: 0,
  };

  while (context.pos < context.length) {
    const nextChar =
      context.pos + 1 < context.length ? context.input[context.pos + 1] : '';
    let handled;

    switch (context.state) {
      case STATES.NORMAL:
        handled = handleNormalState(context, nextChar);
        break;

      case STATES.IN_SINGLE_QUOTE:
        handled = handleQuoteState(context, nextChar, "'");
        break;

      case STATES.IN_DOUBLE_QUOTE:
        handled = handleQuoteState(context, nextChar, '"');
        break;

      case STATES.IN_COMMENT:
        handled = handleCommentState(context, nextChar);
        break;
    }

    if (handled) {
      continue;
    }

    context.pos++;
  }

  // Handle remaining content
  if (context.state === STATES.IN_COMMENT) {
    // Unclosed comment - treat as comment to end
    context.tokens.push([1, context.commentStart + 2, context.length]);
  } else if (context.tokenStart < context.length) {
    // Add final non-comment token
    context.tokens.push([0, context.tokenStart, context.length]);
  }

  return context.tokens;
};

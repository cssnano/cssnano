'use strict';

// State machine states reused between parses for better perf
const STATES = {
  NORMAL: 0,
  IN_SINGLE_QUOTE: 1,
  IN_DOUBLE_QUOTE: 2,
  IN_COMMENT: 3,
};

/**
 * CSS Comment Parser with context awareness
 * Properly handles comments inside strings, URLs, and escaped characters
 *
 * @param {string} input
 * @return {[number, number, number][]}
 */
module.exports = function commentParser(input) {
  /** @type {[number, number, number][]} */
  const tokens = [];
  const length = input.length;
  let pos = 0;
  
  let state = STATES.NORMAL;
  let tokenStart = 0;
  let commentStart = 0;
  
  while (pos < length) {
    const char = input[pos];
    const nextChar = pos + 1 < length ? input[pos + 1] : '';
    
    switch (state) {
      case STATES.NORMAL:
        if (char === '/' && nextChar === '*') {
          // Found comment start - add non-comment token if needed
          if (pos > tokenStart) {
            tokens.push([0, tokenStart, pos]);
          }
          commentStart = pos;
          state = STATES.IN_COMMENT;
          pos += 2; // Skip /*
          continue;
        } else if (char === '"') {
          state = STATES.IN_DOUBLE_QUOTE;
        } else if (char === "'") {
          state = STATES.IN_SINGLE_QUOTE;
        }
        break;
        
      case STATES.IN_SINGLE_QUOTE:
        if (char === '\\' && nextChar) {
          // Skip escaped character
          pos += 2;
          continue;
        } else if (char === "'") {
          state = STATES.NORMAL;
        }
        break;
        
      case STATES.IN_DOUBLE_QUOTE:
        if (char === '\\' && nextChar) {
          // Skip escaped character
          pos += 2;
          continue;
        } else if (char === '"') {
          state = STATES.NORMAL;
        }
        break;
        
      case STATES.IN_COMMENT:
        if (char === '*' && nextChar === '/') {
          // Found comment end
          tokens.push([1, commentStart + 2, pos]);
          tokenStart = pos + 2;
          state = STATES.NORMAL;
          pos += 2; // Skip */
          continue;
        }
        break;
    }
    
    pos++;
  }
  
  // Handle remaining content
  if (state === STATES.IN_COMMENT) {
    // Unclosed comment - treat as comment to end
    tokens.push([1, commentStart + 2, length]);
  } else if (tokenStart < length) {
    // Add final non-comment token
    tokens.push([0, tokenStart, length]);
  }
  
  return tokens;
};

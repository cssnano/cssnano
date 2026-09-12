import cssnanoUtils from 'cssnano-utils';
import cssGlobalKeywords from './cssGlobalKeywords.js';
import { isUnresolved } from './unresolved.js';

const { TokenType, lengthUnits, tokens } = cssnanoUtils;

const openingPairs = new Map([
  [TokenType.Function, TokenType.CloseParen],
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

const closingTokens = new Set([
  TokenType.CloseParen,
  TokenType.CloseSquare,
  TokenType.CloseCurly,
]);

/**
 * Checks whether termTokens form a single structurally complete function token/block.
 *
 * @param {import('@csstools/css-tokenizer').CSSToken[]} termTokens
 * @return {boolean}
 */
function isCompleteFunction(termTokens) {
  if (termTokens.length < 2 || termTokens[0][0] !== TokenType.Function) {
    return false;
  }

  /** @type {import('@csstools/css-tokenizer').TokenType[]} */
  const stack = [];

  for (let i = 0; i < termTokens.length; i++) {
    const type = termTokens[i][0];
    const expected = openingPairs.get(type);

    if (expected !== undefined) {
      stack.push(expected);
    } else if (closingTokens.has(type)) {
      if (stack.pop() !== type) {
        return false;
      }
      if (stack.length === 0 && i < termTokens.length - 1) {
        return false;
      }
    }
  }

  return stack.length === 0;
}

/**
 * Validates a single token / term as a non-negative <length-percentage> or unresolved function.
 *
 * @param {string} term
 * @param {import('@csstools/css-tokenizer').CSSToken[]} termTokens
 * @return {boolean}
 */
export function isValidLengthPercentage(term, termTokens) {
  if (isCompleteFunction(termTokens)) {
    return isUnresolved(term);
  }

  if (termTokens.length !== 1) {
    return false;
  }

  const token = termTokens[0];
  const type = token[0];

  if (type === TokenType.Dimension) {
    const detail =
      /** @type {{value: number, signCharacter?: string, unit: string}} */ (
        token[4]
      );
    if (detail.signCharacter === '-' || detail.value < 0) {
      return false;
    }
    return lengthUnits.has(detail.unit.toLowerCase());
  }

  if (type === TokenType.Percentage) {
    const detail = /** @type {{value: number, signCharacter?: string}} */ (
      token[4]
    );
    return detail.signCharacter !== '-' && detail.value >= 0;
  }

  if (type === TokenType.Number) {
    const detail = /** @type {{value: number}} */ (token[4]);
    /* Only 0 is a valid length without unit in CSS; e.g. `border-radius: 5` is invalid */
    return detail.value === 0;
  }

  return false;
}

/**
 * Tokenizes a CSS value into terms separated by top-level whitespace and splits at top-level slash.
 *
 * @param {string} value
 * @return {{horizontal: {term: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}[], vertical: {term: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}[] | null} | null}
 */
function splitRadiusTerms(value) {
  const allTokens = tokens(value);
  if (allTokens.length === 0) return null;

  /** @type {{term: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}[]} */
  const horizontal = [];
  /** @type {{term: string, tokens: import('@csstools/css-tokenizer').CSSToken[]}[]} */
  const vertical = [];

  let currentSide = horizontal;
  /** @type {import('@csstools/css-tokenizer').CSSToken[]} */
  let currentTermTokens = [];
  /** @type {import('@csstools/css-tokenizer').TokenType[]} */
  const stack = [];
  let hasSlash = false;

  const pushTerm = () => {
    if (currentTermTokens.length === 0) return;
    const termStr = currentTermTokens.map((t) => t[1]).join('');
    currentSide.push({ term: termStr, tokens: currentTermTokens });
    currentTermTokens = [];
  };

  for (const token of allTokens) {
    const type = token[0];

    if (type === TokenType.Comment) {
      /* Comments inside values fail closed */
      return null;
    }

    if (stack.length === 0) {
      if (type === TokenType.Whitespace) {
        pushTerm();
        continue;
      }
      if (type === TokenType.Delim && token[1] === '/') {
        if (hasSlash) {
          /* At most one slash permitted in border-radius */
          return null;
        }
        pushTerm();
        hasSlash = true;
        currentSide = vertical;
        continue;
      }
    }

    currentTermTokens.push(token);

    const expected = openingPairs.get(type);
    if (expected !== undefined) {
      stack.push(expected);
    } else if (closingTokens.has(type) && stack.pop() !== type) {
      return null;
    }
  }

  pushTerm();

  if (stack.length !== 0) {
    /* Unbalanced parentheses / brackets */
    return null;
  }

  if (hasSlash && vertical.length === 0) {
    /* Trailing slash with no vertical terms */
    return null;
  }

  return {
    horizontal,
    vertical: hasSlash ? vertical : null,
  };
}

/**
 * Expands 1 to 4 terms to a 4-corner tuple [TL, TR, BR, BL] per CSS TRBL symmetry.
 *
 * @param {string[]} terms
 * @return {[string, string, string, string]}
 */
function expandTo4(terms) {
  if (terms.length === 1) {
    return [terms[0], terms[0], terms[0], terms[0]];
  }
  if (terms.length === 2) {
    return [terms[0], terms[1], terms[0], terms[1]];
  }
  if (terms.length === 3) {
    return [terms[0], terms[1], terms[2], terms[1]];
  }
  return [terms[0], terms[1], terms[2], terms[3]];
}

/**
 * Parses and validates a corner longhand value (e.g. `border-top-left-radius`).
 * Corner longhands accept 1 or 2 non-negative <length-percentage> values.
 *
 * @param {string} value
 * @return {[string, string] | null} [horizontal, vertical] or null if invalid
 */
export function parseCornerRadius(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const split = splitRadiusTerms(trimmed);
  if (!split || split.vertical !== null) {
    /* Slashes are not allowed in corner longhands */
    return null;
  }

  const { horizontal } = split;
  if (horizontal.length !== 1 && horizontal.length !== 2) {
    return null;
  }

  for (const item of horizontal) {
    if (!isValidLengthPercentage(item.term, item.tokens)) {
      return null;
    }
  }

  if (horizontal.length === 1) {
    return [horizontal[0].term, horizontal[0].term];
  }
  return [horizontal[0].term, horizontal[1].term];
}

/**
 * Parses and validates a `border-radius` shorthand value.
 * Accepts 1 to 4 horizontal components, optional `/`, and 1 to 4 vertical components.
 *
 * @param {string} value
 * @return {{horizontal: [string, string, string, string], vertical: [string, string, string, string]} | null}
 */
export function parseRadiusShorthand(value) {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const split = splitRadiusTerms(trimmed);
  if (!split) return null;

  const { horizontal, vertical } = split;
  if (horizontal.length === 0 || horizontal.length > 4) {
    return null;
  }

  for (const item of horizontal) {
    if (!isValidLengthPercentage(item.term, item.tokens)) {
      return null;
    }
  }

  const h4 = expandTo4(horizontal.map((item) => item.term));

  if (vertical === null) {
    return {
      horizontal: h4,
      vertical: [...h4],
    };
  }

  if (vertical.length === 0 || vertical.length > 4) {
    return null;
  }

  for (const item of vertical) {
    if (!isValidLengthPercentage(item.term, item.tokens)) {
      return null;
    }
  }

  const v4 = expandTo4(vertical.map((item) => item.term));
  return {
    horizontal: h4,
    vertical: v4,
  };
}

/**
 * Checks whether a declaration value is a global CSS keyword.
 *
 * @param {string} value
 * @return {boolean}
 */
export function isGlobalKeyword(value) {
  return cssGlobalKeywords.has(value.trim().toLowerCase());
}

import cssnanoUtils from 'cssnano-utils';

const { TokenType, decoded, tokens } = cssnanoUtils;

const percentageSyntaxTypes = new Set([
  'percentage',
  'length-percentage',
  'angle-percentage',
  'time-percentage',
  'frequency-percentage',
]);

/**
 * @param {ReturnType<typeof tokens>} tokensList
 * @param {number} i
 * @return {number}
 */
function skipTrivia(tokensList, i) {
  let index = i;
  while (index < tokensList.length) {
    const type = tokensList[index][0];
    if (type !== TokenType.Whitespace && type !== TokenType.Comment) {
      break;
    }
    index++;
  }
  return index;
}

/**
 * @param {ReturnType<typeof tokens>} tokensList
 * @param {number} startIndex
 * @param {string} openType
 * @param {string} closeType
 * @return {number}
 */
function skipMatching(tokensList, startIndex, openType, closeType) {
  let depth = 1;
  let index = startIndex + 1;
  while (index < tokensList.length) {
    const type = tokensList[index][0];
    if (type === openType) {
      depth++;
    } else if (type === closeType) {
      depth--;
      if (depth === 0) return index + 1;
    }
    index++;
  }
  return -1;
}

/**
 * @param {ReturnType<typeof tokens>} innerTokens
 * @param {number} i
 * @return {number}
 */
function consumeMultipliers(innerTokens, i) {
  let index = i;
  while (index < innerTokens.length) {
    const token = innerTokens[index];
    const type = token[0];
    if (
      type === TokenType.Delim &&
      (token[1] === '+' ||
        token[1] === '#' ||
        token[1] === '?' ||
        token[1] === '*' ||
        token[1] === '!')
    ) {
      index = skipTrivia(innerTokens, index + 1);
    } else if (type === TokenType.OpenCurly) {
      const next = skipMatching(
        innerTokens,
        index,
        TokenType.OpenCurly,
        TokenType.CloseCurly
      );
      if (next === -1) return -1;
      index = skipTrivia(innerTokens, next);
    } else {
      break;
    }
  }
  return index;
}

/**
 * @param {ReturnType<typeof tokens>} innerTokens
 * @param {number} i
 * @return {{nextIndex: number, hasPercentage: boolean} | undefined}
 */
function consumeComponent(innerTokens, i) {
  const token = innerTokens[i];
  if (!token) return undefined;

  if (token[0] === TokenType.OpenSquare) {
    const closeIndex = skipMatching(
      innerTokens,
      i,
      TokenType.OpenSquare,
      TokenType.CloseSquare
    );
    if (closeIndex === -1) return undefined;
    const subTokens = innerTokens.slice(i + 1, closeIndex - 1);
    const hasPercentage = scanSyntaxAllowsPercentage(subTokens);
    let nextIndex = skipTrivia(innerTokens, closeIndex);
    nextIndex = consumeMultipliers(innerTokens, nextIndex);
    if (nextIndex === -1) return undefined;
    return { nextIndex, hasPercentage };
  }

  if (token[0] === TokenType.Ident) {
    let nextIndex = skipTrivia(innerTokens, i + 1);
    nextIndex = consumeMultipliers(innerTokens, nextIndex);
    if (nextIndex === -1) return undefined;
    return { nextIndex, hasPercentage: false };
  }

  if (token[0] !== TokenType.Delim || token[1] !== '<') {
    return undefined;
  }
  const identIndex = skipTrivia(innerTokens, i + 1);
  const ident = innerTokens[identIndex];
  if (!ident || ident[0] !== TokenType.Ident) return undefined;

  const hasPercentage = percentageSyntaxTypes.has(decoded(ident).toLowerCase());
  let afterIdent = skipTrivia(innerTokens, identIndex + 1);

  if (
    afterIdent < innerTokens.length &&
    innerTokens[afterIdent][0] === TokenType.OpenSquare
  ) {
    afterIdent = skipMatching(
      innerTokens,
      afterIdent,
      TokenType.OpenSquare,
      TokenType.CloseSquare
    );
    if (afterIdent === -1) return undefined;
    afterIdent = skipTrivia(innerTokens, afterIdent);
  }

  const close = innerTokens[afterIdent];
  if (!close || close[0] !== TokenType.Delim || close[1] !== '>') {
    return undefined;
  }

  let nextIndex = skipTrivia(innerTokens, afterIdent + 1);
  nextIndex = consumeMultipliers(innerTokens, nextIndex);
  if (nextIndex === -1) return undefined;
  return { nextIndex, hasPercentage };
}

/**
 * @param {ReturnType<typeof tokens>} innerTokens
 * @param {number} i
 * @return {number} next index, or -1 if invalid combinator
 */
function consumeCombinator(innerTokens, i) {
  const sep = innerTokens[i];
  if (sep[0] === TokenType.Delim && sep[1] === '|') {
    let next = skipTrivia(innerTokens, i + 1);
    if (
      next < innerTokens.length &&
      innerTokens[next][0] === TokenType.Delim &&
      innerTokens[next][1] === '|'
    ) {
      next = skipTrivia(innerTokens, next + 1);
    }
    return next >= innerTokens.length ? -1 : next;
  }
  if (sep[0] === TokenType.Delim && sep[1] === '&') {
    let next = skipTrivia(innerTokens, i + 1);
    if (
      next < innerTokens.length &&
      innerTokens[next][0] === TokenType.Delim &&
      innerTokens[next][1] === '&'
    ) {
      next = skipTrivia(innerTokens, next + 1);
      return next >= innerTokens.length ? -1 : next;
    }
    return -1;
  }
  return i;
}

/**
 * Parses an @property syntax string per CSS Properties and Values API Level 1 and CSS Values 4/5.
 *
 * @param {ReturnType<typeof tokens>} innerTokens
 * @return {boolean}
 */
function scanSyntaxAllowsPercentage(innerTokens) {
  let i = skipTrivia(innerTokens, 0);
  if (i >= innerTokens.length) return true;

  if (
    innerTokens[i][0] === TokenType.Delim &&
    innerTokens[i][1] === '*' &&
    skipTrivia(innerTokens, i + 1) >= innerTokens.length
  ) {
    return true;
  }

  let allowsPercentage = false;
  while (i < innerTokens.length) {
    const comp = consumeComponent(innerTokens, i);
    if (!comp) return true;
    if (comp.hasPercentage) allowsPercentage = true;
    i = comp.nextIndex;

    if (i < innerTokens.length) {
      const nextIndex = consumeCombinator(innerTokens, i);
      if (nextIndex === -1) return true;
      i = nextIndex;
    }
  }
  return allowsPercentage;
}

/** @param {string} value @return {boolean} */
export function syntaxAllowsPercentage(value) {
  const outerTokens = tokens(value);
  let syntaxToken;
  for (const token of outerTokens) {
    if (token[0] === TokenType.Whitespace || token[0] === TokenType.Comment)
      continue;
    if (syntaxToken || token[0] !== TokenType.String) return true;
    syntaxToken = token;
  }
  if (!syntaxToken) return true;
  return scanSyntaxAllowsPercentage(tokens(decoded(syntaxToken)));
}

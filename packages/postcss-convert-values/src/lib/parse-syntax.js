import cssnanoUtils from 'cssnano-utils';

const { TokenType, decoded, tokens } = cssnanoUtils;

const percentageSyntaxTypes = new Set(['percentage', 'length-percentage']);

const closingTokens = new Map([
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

/**
 * @param {typeof TokenType.OpenParen | typeof TokenType.OpenSquare | typeof TokenType.OpenCurly} type
 * @return {typeof TokenType.CloseParen | typeof TokenType.CloseSquare | typeof TokenType.CloseCurly}
 */
export function closeForOpening(type) {
  const close = closingTokens.get(type);
  if (close === undefined) throw new Error(`Unknown opening token: ${type}`);
  return /** @type {typeof TokenType.CloseParen | typeof TokenType.CloseSquare | typeof TokenType.CloseCurly} */ (
    close
  );
}

/**
 * @param {ReturnType<typeof tokens>} input
 * @return {{containsPercentage: boolean, valid: boolean}}
 */
function parseSyntax(input) {
  let index = 0;
  let containsPercentage = false;
  /** @type {string[]} */
  const delimiters = [];

  /** @param {ReturnType<typeof tokens>[number] | undefined} token */
  const isTrivia = (token) =>
    token?.[0] === TokenType.Whitespace || token?.[0] === TokenType.Comment;
  const skipTrivia = () => {
    while (isTrivia(input[index])) index++;
  };
  /** @param {ReturnType<typeof tokens>[number] | undefined} token */
  const isClosing = (token) =>
    token?.[0] === TokenType.CloseParen ||
    token?.[0] === TokenType.CloseSquare ||
    token?.[0] === TokenType.CloseCurly;
  /** @param {ReturnType<typeof tokens>[number] | undefined} token */
  const isLiteral = (token) =>
    token?.[0] === TokenType.AtKeyword ||
    token?.[0] === TokenType.Dimension ||
    token?.[0] === TokenType.Hash ||
    token?.[0] === TokenType.Ident ||
    token?.[0] === TokenType.Number ||
    token?.[0] === TokenType.Percentage ||
    token?.[0] === TokenType.String ||
    token?.[0] === TokenType.URL ||
    token?.[0] === TokenType.UnicodeRange;
  /** @param {number} start @return {number} */
  const nextSignificant = (start) => {
    let cursor = start;
    while (isTrivia(input[cursor])) cursor++;
    return cursor;
  };

  /** Consume a boolean combinator. A single `|` is valid; `&` must be paired. */
  const consumeOperator = () => {
    const token = input[index];
    if (token?.[0] !== TokenType.Delim) return false;
    if (token[1] === '|') {
      index++;
      const next = nextSignificant(index);
      if (input[next]?.[0] === TokenType.Delim && input[next][1] === '|')
        index = next + 1;
      return true;
    }
    if (token[1] !== '&') return false;
    const next = nextSignificant(index + 1);
    if (input[next]?.[0] !== TokenType.Delim || input[next][1] !== '&')
      return false;
    index = next + 1;
    return true;
  };

  const consumeRange = () => {
    index++;
    delimiters.push(TokenType.CloseSquare);
    let side = 0;
    let hasBound = false;
    let hasComma = false;
    while (index < input.length) {
      skipTrivia();
      const token = input[index];
      if (!token) return false;
      if (token[0] === TokenType.CloseSquare) {
        if (!hasComma || !hasBound || side !== 1) return false;
        delimiters.pop();
        index++;
        return true;
      }
      if (token[0] === TokenType.Comma) {
        if (hasComma || !hasBound) return false;
        hasComma = true;
        side++;
        hasBound = false;
        index++;
        continue;
      }
      if (
        token[0] === TokenType.Number ||
        token[0] === TokenType.Percentage ||
        token[0] === TokenType.Dimension ||
        token[0] === TokenType.Ident ||
        (token[0] === TokenType.Delim && (token[1] === '+' || token[1] === '-'))
      ) {
        hasBound = true;
        index++;
        continue;
      }
      return false;
    }
    return false;
  };

  const consumeBoundedMultiplier = () => {
    const start = nextSignificant(index);
    if (input[start]?.[0] !== TokenType.OpenCurly) return false;
    let cursor = nextSignificant(start + 1);
    const minimum = input[cursor];
    if (minimum?.[0] !== TokenType.Number) return false;
    const minimumValue = /** @type {{value: number}} */ (minimum[4]);
    if (!Number.isInteger(minimumValue.value)) return false;
    cursor = nextSignificant(cursor + 1);
    if (input[cursor]?.[0] !== TokenType.Comma) return false;
    cursor = nextSignificant(cursor + 1);
    const maximum = input[cursor];
    if (maximum?.[0] !== TokenType.Number) return false;
    const maximumValue = /** @type {{value: number}} */ (maximum[4]);
    if (!Number.isInteger(maximumValue.value)) return false;
    cursor = nextSignificant(cursor + 1);
    if (input[cursor]?.[0] !== TokenType.CloseCurly) return false;
    index = cursor + 1;
    return true;
  };

  const consumeMultiplier = () => {
    const start = nextSignificant(index);
    const token = input[start];
    if (
      token?.[0] === TokenType.Delim &&
      ['?', '*', '+', '#'].includes(token[1])
    ) {
      index = start + 1;
      return true;
    }
    return consumeBoundedMultiplier();
  };

  const consumeComponent = () => {
    index++;
    skipTrivia();
    const name = input[index];
    if (name?.[0] !== TokenType.Ident) return false;
    const decodedName = decoded(name).toLowerCase();
    index++;
    skipTrivia();
    if (input[index]?.[0] === TokenType.OpenSquare && !consumeRange())
      return false;
    skipTrivia();
    const close = input[index];
    if (close?.[0] !== TokenType.Delim || close[1] !== '>') return false;
    index++;
    if (percentageSyntaxTypes.has(decodedName)) containsPercentage = true;
    consumeMultiplier();
    return true;
  };

  /** @param {string | undefined} expectedClose @return {boolean} */
  const consumeSequence = (expectedClose) => {
    let hasTerm = false;
    let needsTerm = true;
    while (index < input.length) {
      skipTrivia();
      const token = input[index];
      if (!token) break;
      if (token[0] === expectedClose) {
        if (needsTerm || delimiters.at(-1) !== expectedClose) return false;
        delimiters.pop();
        index++;
        return true;
      }
      if (isClosing(token)) return false;
      if (needsTerm) {
        if (consumeOperator()) return false;
      } else if (consumeOperator()) {
        needsTerm = true;
        continue;
      }
      if (!consumeTerm()) return false;
      hasTerm = true;
      needsTerm = false;
    }
    return expectedClose === undefined && hasTerm && !needsTerm;
  };

  const consumeTerm = () => {
    const token = input[index];
    if (!token) return false;
    if (token[0] === TokenType.Delim && token[1] === '<')
      return consumeComponent();
    if (
      token[0] === TokenType.Function ||
      token[0] === TokenType.OpenCurly ||
      (token[0] === TokenType.Delim &&
        ['?', '*', '+', '#', '&', '|'].includes(token[1]))
    )
      return false;
    if (token[0] === TokenType.OpenParen || token[0] === TokenType.OpenSquare) {
      const close = closeForOpening(token[0]);
      delimiters.push(close);
      index++;
      if (!consumeSequence(close)) return false;
      consumeMultiplier();
      return true;
    }
    if (!isLiteral(token)) return false;
    index++;
    consumeMultiplier();
    return true;
  };

  const valid = consumeSequence(undefined);
  return { containsPercentage, valid };
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
  const result = parseSyntax(tokens(decoded(syntaxToken)));
  return result.containsPercentage || !result.valid;
}

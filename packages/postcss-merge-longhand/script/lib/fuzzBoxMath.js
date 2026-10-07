/* A typed reading of the math functions the box fuzzer generates. */

/** @return {never} */
function fail() {
  throw new RangeError('invalid');
}

const mathTokenPattern =
  /(anchor\(--[\w\-]+ \w+\))|(-?\d+(?:\.\d+)?)(px|em|%|cap|deg)?|([a-z]+)\(|(\()|(\))|(, ?)|( ?\* ?)|( ?\/ ?)|( [+\-] )/vy;

/**
 * @typedef {'number' | 'length' | 'percentage' | 'length-percentage' | 'angle'} MathType
 */

/**
 * @param {string} text
 * @return {{kind: string, text: string, unit?: string}[] | undefined}
 */
function tokenizeMath(text) {
  const tokens = [];
  mathTokenPattern.lastIndex = 0;
  while (mathTokenPattern.lastIndex < text.length) {
    const match = mathTokenPattern.exec(text);
    if (!match) return undefined;
    const [, anchor, number, unit, name, ...rest] = match;
    if (anchor) tokens.push({ kind: 'anchor', text: anchor });
    else if (number) tokens.push({ kind: 'number', text: number, unit });
    else if (name) tokens.push({ kind: 'function', text: name });
    else {
      const punctuation = ['(', ')', ',', '*', '/', 'sign'][
        rest.findIndex(Boolean)
      ];
      tokens.push({ kind: punctuation, text: match[0] });
    }
  }
  return tokens;
}

/**
 * @param {MathType} left
 * @param {MathType} right
 * @return {MathType}
 */
function sum(left, right) {
  if (left === right) return left;
  const lengthLike = new Set(['length', 'percentage', 'length-percentage']);
  return lengthLike.has(left) && lengthLike.has(right)
    ? 'length-percentage'
    : fail();
}

/**
 * Types an expression of the generated shape, which CSS Values 4 defines by
 * the rules that a sum needs one type, a product one number, and a quotient a
 * number divisor. Written apart from the plugin so that the two can disagree.
 *
 * @param {string} text
 * @param {string} group
 * @param {{anchor: boolean, capUnit: boolean, comparisonFunctions: boolean}} support
 * @return {MathType | undefined}
 */
export function typeOfMath(text, group, support) {
  const tokens = tokenizeMath(text);
  if (!tokens) return undefined;
  let position = 0;

  /** @return {MathType} */
  const leaf = () => {
    const token = tokens[position++];
    if (!token) return fail();
    if (token.kind === 'anchor') {
      return support.anchor && group === 'inset' ? 'length' : fail();
    }
    if (token.kind === 'number') {
      if (token.unit === undefined) return 'number';
      if (token.unit === 'deg') return 'angle';
      if (token.unit === '%') return 'percentage';
      return token.unit !== 'cap' || support.capUnit ? 'length' : fail();
    }
    if (token.kind === '(') return list(1, 1);
    if (token.kind !== 'function') return fail();
    if (token.text === 'calc') return list(1, 1);
    if (!support.comparisonFunctions) return fail();
    if (token.text === 'clamp') return list(3, 3);
    return token.text === 'min' || token.text === 'max'
      ? list(1, Infinity)
      : fail();
  };
  /** @return {MathType} */
  const product = () => {
    let type = leaf();
    while (tokens[position]?.kind === '*' || tokens[position]?.kind === '/') {
      const times = tokens[position++].kind === '*';
      const operand = leaf();
      if (times) {
        if (operand === 'number') continue;
        type = type === 'number' ? operand : fail();
      } else if (operand !== 'number') {
        fail();
      }
    }
    return type;
  };
  /** @return {MathType} */
  const expression = () => {
    let type = product();
    while (tokens[position]?.kind === 'sign') {
      position++;
      type = sum(type, product());
    }
    return type;
  };
  /**
   * @param {number} least
   * @param {number} most
   * @return {MathType}
   */
  const list = (least, most) => {
    let type = expression();
    let count = 1;
    while (tokens[position]?.kind === ',') {
      position++;
      type = sum(type, expression());
      count++;
    }
    if (tokens[position++]?.kind !== ')' || count < least || count > most) {
      return fail();
    }
    return type;
  };

  try {
    const type = expression();
    return position === tokens.length ? type : undefined;
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

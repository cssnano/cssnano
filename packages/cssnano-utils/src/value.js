import { tokenize, TokenType } from '@csstools/css-tokenizer';

/** @typedef {import('@csstools/css-tokenizer').CSSToken} CSSToken */
/** @typedef {{start: number, end: number, text: string, priority?: number}} SourceEdit */
/** @typedef {{edit: SourceEdit, left?: IntervalNode, right?: IntervalNode, height: number, maxEnd: number, maxPriority: number}} IntervalNode */
/** @typedef {{index: number, start: number, end: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */

/** @param {CSSToken} token @return {string} */
function decoded(token) {
  return /** @type {{value?: string}} */ (token[4])?.value ?? token[1];
}

/** @param {string} value @return {CSSToken[]} */
function tokens(value) {
  return [...tokenize({ css: value })].filter(
    (token) => token[0] !== TokenType.EOF
  );
}

/** @param {CSSToken} token @return {number} */
function tokenStart(token) {
  return token[2];
}

/** @param {CSSToken} token @return {number} */
function tokenEnd(token) {
  return token[3] + 1;
}

/** @param {IntervalNode | undefined} node */
function intervalHeight(node) {
  return node?.height ?? 0;
}
/** @param {SourceEdit} edit */
function intervalPriority(edit) {
  return edit.priority ?? 0;
}
/** @param {IntervalNode} node */
function refreshInterval(node) {
  node.height =
    Math.max(intervalHeight(node.left), intervalHeight(node.right)) + 1;
  node.maxEnd = Math.max(
    node.edit.end,
    node.left?.maxEnd ?? -Infinity,
    node.right?.maxEnd ?? -Infinity
  );
  node.maxPriority = Math.max(
    intervalPriority(node.edit),
    node.left?.maxPriority ?? -Infinity,
    node.right?.maxPriority ?? -Infinity
  );
  return node;
}
/** @param {IntervalNode} node */
function rotateIntervalRight(node) {
  const pivot = /** @type {IntervalNode} */ (node.left);
  node.left = pivot.right;
  pivot.right = refreshInterval(node);
  return refreshInterval(pivot);
}
/** @param {IntervalNode} node */
function rotateIntervalLeft(node) {
  const pivot = /** @type {IntervalNode} */ (node.right);
  node.right = pivot.left;
  pivot.left = refreshInterval(node);
  return refreshInterval(pivot);
}
/** @param {IntervalNode} node */
function balanceInterval(node) {
  refreshInterval(node);
  const difference = intervalHeight(node.left) - intervalHeight(node.right);
  if (difference > 1) {
    if (intervalHeight(node.left?.right) > intervalHeight(node.left?.left))
      node.left = rotateIntervalLeft(/** @type {IntervalNode} */ (node.left));
    return rotateIntervalRight(node);
  }
  if (difference < -1) {
    if (intervalHeight(node.right?.left) > intervalHeight(node.right?.right))
      node.right = rotateIntervalRight(
        /** @type {IntervalNode} */ (node.right)
      );
    return rotateIntervalLeft(node);
  }
  return node;
}
/** @param {IntervalNode | undefined} node @param {SourceEdit} edit @return {IntervalNode} */
function insertInterval(node, edit) {
  if (!node)
    return {
      edit,
      height: 1,
      maxEnd: edit.end,
      maxPriority: intervalPriority(edit),
    };
  if (edit.start < node.edit.start) node.left = insertInterval(node.left, edit);
  else node.right = insertInterval(node.right, edit);
  return balanceInterval(node);
}
/** @param {IntervalNode | undefined} node @param {SourceEdit} edit @return {SourceEdit | undefined} */
function findIntervalOverlap(node, edit) {
  /** @type {SourceEdit | undefined} */
  let overlap;
  /** @param {IntervalNode | undefined} current */
  function visit(current) {
    if (
      !current ||
      current.maxEnd <= edit.start ||
      (overlap && current.maxPriority <= intervalPriority(overlap))
    )
      return;
    visit(current.left);
    if (current.edit.start >= edit.end) return;
    const overlaps =
      (edit.start < current.edit.end && current.edit.start < edit.end) ||
      (edit.start === edit.end &&
        current.edit.start < edit.start &&
        edit.start < current.edit.end) ||
      (current.edit.start === current.edit.end &&
        edit.start < current.edit.start &&
        current.edit.start < edit.end);
    if (
      overlaps &&
      (!overlap || intervalPriority(current.edit) > intervalPriority(overlap))
    )
      overlap = current.edit;
    visit(current.right);
  }
  visit(node);
  return overlap;
}

/**
 * Apply source edits. Invalid source bounds and equally prioritized overlaps
 * fail closed, preserving the complete input instead of a partial rewrite.
 *
 * @param {string} source
 * @param {SourceEdit[]} edits
 * @return {string}
 */
function applyEdits(source, edits) {
  // Validate before accepting anything: callers rely on one bad candidate
  // leaving the complete value untouched.
  for (const edit of edits) {
    const priority = edit.priority ?? 0;
    if (
      !Number.isInteger(edit.start) ||
      !Number.isInteger(edit.end) ||
      !Number.isFinite(priority) ||
      edit.start < 0 ||
      edit.end < edit.start ||
      edit.end > source.length
    )
      return source;
  }

  /** @type {IntervalNode | undefined} */
  let intervals;
  /** @type {SourceEdit[]} */
  const accepted = [];
  for (const edit of [...edits].toSorted(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  )) {
    const priority = edit.priority ?? 0;
    const overlap = findIntervalOverlap(intervals, edit);
    if (overlap) {
      if ((overlap.priority ?? 0) === priority) return source;
      continue;
    }
    accepted.push(edit);
    intervals = insertInterval(intervals, edit);
  }
  const ordered = accepted.toSorted(
    (a, b) => a.start - b.start || a.end - a.start - (b.end - b.start)
  );
  let cursor = 0;
  let result = '';
  for (const edit of ordered) {
    result += source.slice(cursor, edit.start) + edit.text;
    cursor = edit.end;
  }
  return result + source.slice(cursor);
}

/** @param {CSSToken} token @return {{number: number, unit: string} | false} */
function numeric(token) {
  if (token[0] === TokenType.Number)
    return {
      number: /** @type {{value: number}} */ (token[4]).value,
      unit: '',
    };
  if (token[0] === TokenType.Percentage)
    return {
      number: /** @type {{value: number}} */ (token[4]).value,
      unit: '%',
    };
  if (token[0] === TokenType.Dimension) {
    const value = /** @type {{value: number, unit: string}} */ (token[4]);
    return { number: value.value, unit: value.unit };
  }
  return false;
}

/**
 * Capture one numeric source spelling, including PostCSS's historic `1.em`
 * token shape. Its `end` is a character offset exclusive of the source.
 *
 * @param {CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
function numericSource(input, index) {
  const token = input[index];
  const value = token && numeric(token);
  if (!token || !value) return false;
  let endIndex = index;
  let end = tokenEnd(token);
  let raw = token[1];
  let unit = value.unit;
  let hasDecimal = raw.includes('.');
  const dot = input[endIndex + 1];
  if (
    token[0] === TokenType.Number &&
    dot?.[0] === TokenType.Delim &&
    dot[1] === '.' &&
    tokenStart(dot) === end
  ) {
    raw += dot[1];
    endIndex++;
    end = tokenEnd(dot);
    hasDecimal = true;
    const ident = input[endIndex + 1];
    if (ident?.[0] === TokenType.Ident && tokenStart(ident) === end) {
      unit = ident[1];
      raw += ident[1];
      endIndex++;
      end = tokenEnd(ident);
    }
  }
  return {
    index: endIndex,
    start: tokenStart(token),
    end,
    raw,
    ...value,
    unit,
    hasDecimal,
  };
}

const closeFor = new Map([
  [TokenType.Function, TokenType.CloseParen],
  [TokenType.OpenParen, TokenType.CloseParen],
  [TokenType.OpenSquare, TokenType.CloseSquare],
  [TokenType.OpenCurly, TokenType.CloseCurly],
]);

/**
 * Lexical CSS block index. This does not parse or validate any CSS grammar;
 * consumers must preserve raw spelling and define their own malformed-input policy.
 */
class BalancedTokens {
  /** @readonly @type {readonly CSSToken[]} */
  tokens;
  /** @type {Map<number, number>} */
  #ends;

  /** @param {readonly CSSToken[]} input @param {Map<number, number>} ends */
  constructor(input, ends) {
    this.tokens = input;
    this.#ends = ends;
  }

  /** @param {number} index @return {number | undefined} */
  endForOpening(index) {
    return this.#ends.get(index);
  }

  /**
   * Split a balanced token range at delimiters visible at its own lexical level.
   * Range bounds are token indexes and `endIndex` is exclusive.
   *
   * @param {number} [startIndex]
   * @param {number} [endIndex]
   * @param {TokenType} [delimiter]
   * @return {{startIndex: number, endIndex: number}[]}
   */
  topLevelSegments(
    startIndex = 0,
    endIndex = this.tokens.length,
    delimiter = TokenType.Comma
  ) {
    const result = [];
    let segmentStart = startIndex;
    for (let index = startIndex; index < endIndex; index++) {
      const frameEnd = this.endForOpening(index);
      if (frameEnd !== undefined) {
        index = frameEnd;
        continue;
      }
      if (this.tokens[index][0] === delimiter) {
        result.push({ startIndex: segmentStart, endIndex: index });
        segmentStart = index + 1;
      }
    }
    result.push({ startIndex: segmentStart, endIndex });
    return result;
  }
}

/** @param {string} source @return {BalancedTokens | undefined} */
function balancedTokens(source) {
  try {
    const input = [];
    /** @type {[number, TokenType][]} */
    const stack = [];
    const ends = new Map();
    for (const token of tokenize({ css: source })) {
      if (token[0] === TokenType.EOF) continue;
      const index = input.length;
      input.push(token);
      const expected = closeFor.get(token[0]);
      if (expected !== undefined) stack.push([index, expected]);
      else if (
        token[0] === TokenType.CloseParen ||
        token[0] === TokenType.CloseSquare ||
        token[0] === TokenType.CloseCurly
      ) {
        const frame = stack.pop();
        if (!frame || frame[1] !== token[0]) return;
        ends.set(frame[0], index);
      }
    }
    return stack.length ? undefined : new BalancedTokens(input, ends);
  } catch {
    return;
  }
}

export {
  TokenType,
  applyEdits,
  balancedTokens,
  decoded,
  numeric,
  numericSource,
  tokenEnd,
  tokenStart,
  tokens,
};

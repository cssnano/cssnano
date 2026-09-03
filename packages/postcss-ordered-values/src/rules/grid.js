import joinGridValue from '../lib/joinGridValue.js';
import { isIdent, isNumber, name } from '../lib/tokenize.js';

/**
 * @param {import('../lib/tokenize.js').Term[]} gridAutoFlow
 * @return {string | null}
 */
const normalizeGridAutoFlow = (gridAutoFlow) => {
  const newValue = { front: '', back: '' };
  let shouldNormalize = false;
  let hasDense = false;
  let hasTrack = false;
  for (const node of gridAutoFlow) {
    const value = node.raw;
    const keyword = isIdent(node) ? name(node) : '';
    if (keyword === 'dense') {
      if (hasDense) return null;
      hasDense = true;
      shouldNormalize = true;
      newValue.back = value;
    } else if (['row', 'column'].includes(keyword)) {
      if (hasTrack) return null;
      hasTrack = true;
      shouldNormalize = true;
      newValue.front = value;
    } else {
      return null;
    }
  }
  if (shouldNormalize) {
    return [newValue.front.trim(), newValue.back.trim()]
      .filter(Boolean)
      .join(' ');
  }
  return null;
};

/**
 * @param {import('../lib/tokenize.js').Term[]} gridGap
 * @return {string | null}
 */
const normalizeGridColumnRowGap = (gridGap) => {
  const newValue = { front: '', back: '' };
  let shouldNormalize = false;
  let hasNormal = false;
  let hasLength = false;
  for (const node of gridGap) {
    // console.log(node);
    if (isIdent(node) && name(node) === 'normal') {
      if (hasNormal) return null;
      hasNormal = true;
      shouldNormalize = true;
      newValue.front = node.raw;
    } else {
      if (hasLength) return null;
      hasLength = true;
      newValue.back = `${newValue.back} ${node.raw}`;
    }
  }
  if (shouldNormalize) {
    return [newValue.front.trim(), newValue.back.trim()]
      .filter(Boolean)
      .join(' ');
  }
  return null;
};

const gridLineExcludedIdents = new Set([
  'initial',
  'inherit',
  'unset',
  'revert',
  'revert-layer',
  'default',
  'span',
  'auto',
]);

/** @param {import('../lib/tokenize.js').Term} term */
function isGridInteger(term) {
  if (!isNumber(term)) return false;
  const data = /** @type {{ type?: string, value?: number }} */ (
    term.tokens[0][4]
  );
  return data.type === 'integer' && data.value !== 0;
}

/** @param {import('../lib/tokenize.js').Term} term */
function isGridCustomIdent(term) {
  return isIdent(term) && !gridLineExcludedIdents.has(name(term));
}

/** @param {import('../lib/tokenize.js').Term} term */
function classifyGridTerm(term) {
  if (isGridInteger(term)) return 'integer';
  if (isGridCustomIdent(term)) return 'ident';
  if (isIdent(term) && name(term) === 'span') return 'span';
  if (isIdent(term) && name(term) === 'auto') return 'auto';
  return null;
}

/** @param {import('../lib/tokenize.js').Term[]} line */
function isGridLine(line) {
  if (line.length === 0 || line.length > 3) return false;

  const kinds = line.map(classifyGridTerm);
  if (kinds.includes(null)) return false;

  // `auto` is a complete grid-line on its own.
  if (kinds.includes('auto')) return line.length === 1;

  if (kinds.includes('span')) {
    const integerCount = kinds.filter((kind) => kind === 'integer').length;
    const identCount = kinds.filter((kind) => kind === 'ident').length;
    if (
      kinds.filter((kind) => kind === 'span').length !== 1 ||
      integerCount > 1 ||
      identCount > 1 ||
      integerCount + identCount === 0 ||
      line.length !== 1 + integerCount + identCount
    ) {
      return false;
    }

    const integerIndex = kinds.findIndex((kind) => kind === 'integer');
    if (integerIndex === -1) return true;
    const value =
      /** @type {{ value: number }} */ (line[integerIndex].tokens[0][4]).value;
    return value > 0;
  }

  // integer && custom-ident?, where the ordinary integer may be negative.
  return (
    line.length <= 2 &&
    kinds.filter((kind) => kind === 'integer').length === 1 &&
    kinds.every((kind) => kind === 'integer' || kind === 'ident')
  );
}

/**
 * @param {import('../lib/tokenize.js').Term[]} grid
 * @param {number} [maxLines=2] Maximum number of <grid-line>s the property accepts.
 * @return {string | string[] | null}
 */
const normalizeGridColumnRow = (grid, maxLines = 2) => {
  /** @type {import('../lib/tokenize.js').Term[][]} */
  const lines = [[]];
  for (const term of grid) {
    if (term.raw === '/' && term.tokens.length === 1) {
      lines.push([]);
    } else {
      lines[lines.length - 1].push(term);
    }
  }

  // grid-column / grid-row take at most two <grid-line>s; the longhand
  // grid-*-start/end properties take only one.
  if (lines.length > maxLines) return null;
  if (lines.length > 1 && lines.some((line) => line.length === 0)) {
    return null;
  }
  if (!lines.every(isGridLine)) return null;

  const normalized = lines.map((line) => {
    const span = line.find((term) => isIdent(term) && name(term) === 'span');
    if (span) {
      const operands = line.filter((term) => term !== span);
      return [
        span,
        ...operands.filter(isGridInteger),
        ...operands.filter(isGridCustomIdent),
      ];
    }

    const integer = line.find(isGridInteger);
    if (!integer) return line;
    return [integer, ...line.filter((term) => term !== integer)];
  });

  return normalized.length > 1
    ? joinGridValue(
        normalized.map((line) => line.map((term) => term.raw).join(' '))
      )
    : normalized.map((line) => line.map((term) => term.raw).join(' '));
};

export {
  normalizeGridAutoFlow,
  normalizeGridColumnRowGap,
  normalizeGridColumnRow,
};

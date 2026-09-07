import cssnanoUtils from 'cssnano-utils';
import { isDimension, isIdent, isNumber, name } from '../lib/tokenize.js';

const { lengthUnits } = cssnanoUtils;

/**
 * @param {import('../lib/tokenize.js').Term} term
 * @return {boolean}
 */
function isPositiveInteger(term) {
  if (!isNumber(term)) {
    return false;
  }
  const data =
    /** @type {{ type?: string, value?: number, signCharacter?: string } | undefined} */ (
      term.tokens[0][4]
    );
  return (
    data?.type === 'integer' &&
    data.signCharacter !== '-' &&
    typeof data.value === 'number' &&
    data.value > 0 &&
    data.value <= Number.MAX_SAFE_INTEGER
  );
}

/**
 * @param {import('../lib/tokenize.js').Term} term
 * @return {boolean}
 */
function isValidLength(term) {
  if (!isDimension(term)) {
    return false;
  }
  const { value, type, signCharacter, unit } =
    /** @type {{ value?: number, type?: string, signCharacter?: string, unit?: string }} */ (
      term.tokens[0][4] ?? {}
    );
  return (
    typeof unit === 'string' &&
    lengthUnits.has(unit.toLowerCase()) &&
    (type === 'integer' || type === 'number') &&
    typeof value === 'number' &&
    value >= 0 &&
    signCharacter !== '-'
  );
}

/** @param {import('../lib/tokenize.js').Term[]} columns */
export default (columns) => {
  if (columns.length !== 2) {
    return null;
  }

  /** @type {string[]} */
  const widths = [];
  /** @type {string[]} */
  const other = [];
  for (const term of columns) {
    // Multi-token terms (e.g. functions) cannot be classified safely.
    if (term.tokens.length !== 1) {
      return null;
    }
    if (isValidLength(term)) {
      widths.push(term.raw);
    } else if (
      isPositiveInteger(term) ||
      (isIdent(term) && name(term) === 'auto')
    ) {
      other.push(term.raw);
    } else {
      return null;
    }
  }

  // only transform if declaration is not invalid or a single value
  if (other.length === 1 && widths.length === 1) {
    return `${widths[0].trimStart()} ${other[0].trimStart()}`;
  }

  return null;
};

export { lengthUnits };

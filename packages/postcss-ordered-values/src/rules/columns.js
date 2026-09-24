import { isDimension, isIdent, isNumber, name } from '../lib/tokenize.js';
import { lengthUnit } from '../lib/isLength.js';

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
 * A non-negative length per CSS Multi-column: <length [0,∞]> | auto.
 *
 * @param {import('../lib/tokenize.js').Term} term
 * @return {boolean}
 */
function isNonNegativeLength(term) {
  if (!isDimension(term) || lengthUnit(term) === null) {
    return false;
  }
  const { value, signCharacter } =
    /** @type {{ value: number, signCharacter?: string }} */ (
      term.tokens[0][4]
    );
  return value >= 0 && signCharacter !== '-';
}

/** @param {import('../lib/tokenize.js').Term[]} columns */
export default (columns) => {
  if (columns.length !== 2) {
    return null;
  }

  /** @type {string[]} */
  const widths = [];
  /** @type {string[]} */
  const counts = [];
  /** @type {string[]} */
  const autos = [];
  for (const term of columns) {
    // Multi-token terms (e.g. functions) cannot be classified safely.
    if (term.tokens.length !== 1) {
      return null;
    }
    if (isNonNegativeLength(term)) {
      widths.push(term.raw);
    } else if (isPositiveInteger(term)) {
      counts.push(term.raw);
    } else if (isIdent(term) && name(term) === 'auto') {
      autos.push(term.raw);
    } else {
      return null;
    }
  }

  // Duplicate widths or counts leave the other slot empty, so the guard
  // below rejects them.
  // `auto` is accepted by both slot grammars; assign it to whichever of
  // <'column-width'> and <'column-count'> no length or integer filled.
  const width = widths[0] ?? autos.pop();
  const count = counts[0] ?? autos.pop();

  return width && count ? `${width} ${count}` : null;
};

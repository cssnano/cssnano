import cssnanoUtils from '#utils';

const { TokenType, numeric } = cssnanoUtils;

/** @typedef {ReturnType<typeof import('#utils').default.tokens>[number]} CSSToken */
/** @typedef {{index: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */

/**
 * Capture one numeric source spelling, including a trailing dot such as `1.`.
 * Its `index` is the last token of the spelling. Adjacent tokens are next to
 * each other in the list, so no positions are compared.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
export function numericSource(input, index) {
  const token = input[index];
  const value = token && numeric(token);
  if (!token || !value) return false;
  let endIndex = index;
  let raw = token[1];
  const unit = value.unit;
  let hasDecimal = raw.includes('.');
  const dot = input[endIndex + 1];
  // A dot before an identifier is not part of the number: `1.em` is invalid
  // CSS, so the dot stays and the value keeps it.
  if (
    token[0] === TokenType.Number &&
    dot?.[0] === TokenType.Delim &&
    dot[1] === '.' &&
    input[endIndex + 2]?.[0] !== TokenType.Ident
  ) {
    raw += dot[1];
    endIndex++;
    hasDecimal = true;
  }
  return {
    index: endIndex,
    raw,
    ...value,
    unit,
    hasDecimal,
  };
}

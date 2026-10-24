import cssnanoUtils from '#utils';

const { numeric } = cssnanoUtils;

/** @typedef {ReturnType<typeof import('#utils').default.tokens>[number]} CSSToken */
/** @typedef {{index: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */

/**
 * Capture one numeric token as a source spelling. A dot after a number is not
 * part of it, as CSS reads `1.` and `1.em` as a number and a delim: those are
 * invalid, so the value keeps them.
 *
 * @param {readonly CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
export function numericSource(input, index) {
  const token = input[index];
  const value = token && numeric(token);
  if (!token || !value) return false;
  return {
    index,
    raw: token[1],
    ...value,
    hasDecimal: token[1].includes('.'),
  };
}

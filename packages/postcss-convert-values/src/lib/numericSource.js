import cssnanoUtils from 'cssnano-utils';

const { TokenType, numeric, tokenEnd, tokenStart } = cssnanoUtils;

/** @typedef {ReturnType<typeof import('cssnano-utils').default.tokens>[number]} CSSToken */
/** @typedef {{index: number, start: number, end: number, raw: string, number: number, unit: string, hasDecimal: boolean}} NumericSource */

/**
 * Capture one numeric source spelling, including PostCSS's historic `1.em`
 * token shape. Its `end` is a character offset exclusive of the source.
 *
 * @param {CSSToken[]} input
 * @param {number} index
 * @return {NumericSource | false}
 */
export function numericSource(input, index) {
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

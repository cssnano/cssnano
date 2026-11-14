import {
  lineWidth,
  lineStyle,
  lineColor,
  unordered,
  copyFirst,
  sameValue,
  twoValues,
} from './pairFamilyGrammar.js';

/** @import {PairRow, Setter} from './pairFamilyOracle.js' */

const logicalSides = ['block-start', 'block-end', 'inline-start', 'inline-end'];
const borderParts = ['width', 'style', 'color'];
const borderGrammars = [lineWidth, lineStyle, lineColor];
const borderInitials = ['medium', 'none', 'currentcolor'];

/**
 * @param {string} side
 * @return {string[]}
 */
function sideLonghands(side) {
  return borderParts.map((part) => `border-${side}-${part}`);
}

/**
 * CSS Logical Properties 1: the side, axis and component shorthands of the
 * flow-relative borders. The physical border properties name the same sides
 * by writing mode and belong to the `border` evaluator, so the two are not
 * compared with each other.
 *
 * @return {PairRow}
 */
export function logicalBorderRow() {
  /** @type {Record<string, string>} */
  const longhands = {};
  /** @type {Record<string, Setter>} */
  const setters = {};
  for (const side of logicalSides) {
    for (const [slot, name] of sideLonghands(side).entries()) {
      longhands[name] = borderInitials[slot];
      setters[name] = sameValue([name], borderGrammars[slot]);
    }
    setters[`border-${side}`] = {
      names: sideLonghands(side),
      parse: unordered(borderGrammars, borderInitials),
    };
  }
  for (const axis of ['block', 'inline']) {
    const [start, end] = logicalSides.filter((side) => side.startsWith(axis));
    setters[`border-${axis}`] = {
      names: [...sideLonghands(start), ...sideLonghands(end)],
      parse: (value) => {
        const parts = unordered(borderGrammars, borderInitials)(value);
        return parts && [...parts, ...parts];
      },
    };
    for (const [slot, part] of borderParts.entries()) {
      setters[`border-${axis}-${part}`] = twoValues(
        [`border-${start}-${part}`, `border-${end}-${part}`],
        [borderGrammars[slot], borderGrammars[slot]],
        copyFirst
      );
    }
  }
  return { family: 'border-logical', longhands, setters };
}

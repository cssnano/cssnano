import { keywordsOf, sameValue } from './pairFamilyGrammar.js';

/** @import {PairRow, Setter} from './pairFamilyOracle.js' */

/** Closed alphabets: a token outside them is read as invalid. */
const typeGrammar = keywordsOf([
  'none',
  'disc',
  'square',
  'lower-roman',
  '"-"',
]);
const imageGrammar = keywordsOf(['none', 'url(a.png)']);
const positionGrammar = keywordsOf(['inside', 'outside']);

/**
 * The longhands of a `list-style` value, in the order of its names. A `none`
 * alone sets the type and the image. Beside one other type or image it is the
 * other slot. Beside only a position, it is ambiguous and so invalid.
 *
 * @param {string} value
 * @return {(string | undefined)[] | undefined}
 */
function parseListStyle(value) {
  /** @type {string | undefined} */
  let type;
  /** @type {string | undefined} */
  let image;
  /** @type {string | undefined} */
  let position;
  let hasNone = false;
  for (const token of value.trim().split(/\s+/v)) {
    if (token.toLowerCase() === 'none') {
      hasNone = true;
    } else if (positionGrammar(token) !== undefined && position === undefined) {
      position = positionGrammar(token);
    } else if (imageGrammar(token) !== undefined && image === undefined) {
      image = imageGrammar(token);
    } else if (typeGrammar(token) !== undefined && type === undefined) {
      type = typeGrammar(token);
    } else {
      return undefined;
    }
  }
  if (hasNone) {
    if (type === undefined && image === undefined) {
      if (position !== undefined) return undefined;
      type = 'none';
      image = 'none';
    } else if (type !== undefined && image === undefined) {
      image = 'none';
    } else if (image !== undefined && type === undefined) {
      type = 'none';
    } else {
      return undefined;
    }
  }
  return [type ?? 'disc', position ?? 'outside', image ?? 'none'];
}

/**
 * CSS Lists 3, section 3. The three components come in any order, and an
 * omitted one takes its initial value: disc, outside and none.
 *
 * @return {PairRow}
 */
export function listStyleRow() {
  const names = ['list-style-type', 'list-style-position', 'list-style-image'];
  /** @type {Setter} */
  const shorthand = { names, parse: parseListStyle };
  return {
    family: 'list-style',
    longhands: {
      'list-style-type': 'disc',
      'list-style-position': 'outside',
      'list-style-image': 'none',
    },
    setters: {
      'list-style': shorthand,
      'list-style-type': sameValue(['list-style-type'], typeGrammar),
      'list-style-position': sameValue(
        ['list-style-position'],
        positionGrammar
      ),
      'list-style-image': sameValue(['list-style-image'], imageGrammar),
    },
  };
}

/** @import {CSSToken} from '@csstools/css-tokenizer' */

/**
 * Gives each token the positions it has in the text the list spells, so a
 * reader that slices the text by token positions sees the edit. A token whose
 * positions already match is kept as it is.
 *
 * @param {CSSToken[]} list
 */
function renumber(list) {
  let start = 0;
  for (let index = 0; index < list.length; index++) {
    const token = list[index];
    const end = start + token[1].length - 1;
    if (token[2] !== start || token[3] !== end) {
      list[index] = /** @type {CSSToken} */ ([
        token[0],
        token[1],
        start,
        end,
        token[4],
      ]);
    }
    start = end + 1;
  }
}

export { renumber };

/** @import {CSSToken} from '@csstools/css-tokenizer' */
import type { CSSToken } from '@csstools/css-tokenizer';
/**
 * Gives each token the positions it has in the text the list spells, so a
 * reader that slices the text by token positions sees the edit. A token whose
 * positions already match is kept as it is.
 *
 * @param {CSSToken[]} list
 */
declare function renumber(list: CSSToken[]): void;
export { renumber };
//# sourceMappingURL=renumber.d.ts.map
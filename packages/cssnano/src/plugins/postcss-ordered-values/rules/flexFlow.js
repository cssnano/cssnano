import { isIdent, joinTokens, name } from '../lib/tokenize.js';
import { whitespace } from '../../../values/punctuationTokens.js';

/** @import {CSSToken} from '@csstools/css-tokenizer' */

// flex-flow: <flex-direction> || <flex-wrap>

const flexDirection = new Set([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);

const flexWrap = new Set(['nowrap', 'wrap', 'wrap-reverse']);

/** @type {readonly { name: 'direction' | 'wrap', match: (k: string) => boolean }[]} */
const flexFlowSlots = [
  { name: 'direction', match: (k) => flexDirection.has(k) },
  { name: 'wrap', match: (k) => flexWrap.has(k) },
];

/**
 * @param {import('../lib/tokenize.js').Term[]} flexFlow
 * @return {CSSToken[] | null}
 */
function normalizeFlexFlow(flexFlow) {
  /** @type {Record<'direction' | 'wrap', CSSToken[]>} */
  const order = {
    direction: [],
    wrap: [],
  };

  for (const term of flexFlow) {
    if (!isIdent(term)) return null;
    const keyword = name(term);
    const slot = flexFlowSlots.find((s) => s.match(keyword));
    if (!slot || order[slot.name].length > 0) return null;
    order[slot.name] = term.tokens;
  }
  return joinTokens(
    [order.direction, order.wrap].filter((group) => group.length > 0),
    whitespace()
  );
}

export default normalizeFlexFlow;

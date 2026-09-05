import { isIdent, name } from '../lib/tokenize.js';

// flex-flow: <flex-direction> || <flex-wrap>

const flexDirection = new Set([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);

const flexWrap = new Set(['nowrap', 'wrap', 'wrap-reverse']);

const flexFlowSlots = [
  { name: 'direction', match: (k) => flexDirection.has(k) },
  { name: 'wrap', match: (k) => flexWrap.has(k) },
];

/**
 * @param {import('../lib/tokenize.js').Term[]} flexFlow
 * @return {string | null}
 */
function normalizeFlexFlow(flexFlow) {
  const order = {
    direction: '',
    wrap: '',
  };

  for (const term of flexFlow) {
    if (!isIdent(term)) return null;
    const keyword = name(term);
    const slot = flexFlowSlots.find((s) => s.match(keyword));
    if (!slot || order[slot.name]) return null;
    order[slot.name] = term.raw;
  }
  return `${order.direction} ${order.wrap}`.trim();
}

export default normalizeFlexFlow;

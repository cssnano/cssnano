import { isIdent, name } from '../lib/tokenize.js';

// flex-flow: <flex-direction> || <flex-wrap>

const flexDirection = new Set([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);

const flexWrap = new Set(['nowrap', 'wrap', 'wrap-reverse']);

/**
 * @param {import('../lib/tokenize.js').Term[]} flexFlow
 * @return {string | null}
 */
function normalizeFlexFlow(flexFlow) {
  const order = {
    direction: '',
    wrap: '',
  };
  let hasDirection = false;
  let hasWrap = false;

  for (const term of flexFlow) {
    const value = term.raw;
    if (!isIdent(term)) return null;
    const keyword = name(term);
    if (flexDirection.has(keyword)) {
      if (hasDirection) return null;
      hasDirection = true;
      order.direction = value;
      continue;
    }

    if (flexWrap.has(keyword)) {
      if (hasWrap) return null;
      hasWrap = true;
      order.wrap = value;
      continue;
    }

    return null;
  }
  return `${order.direction} ${order.wrap}`.trim();
}

export default normalizeFlexFlow;

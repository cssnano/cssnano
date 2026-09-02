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
 * @return {string}
 */
function normalizeFlexFlow(flexFlow) {
  const order = {
    direction: '',
    wrap: '',
  };

  for (const term of flexFlow) {
    const value = term.raw;
    if (flexDirection.has(value.toLowerCase())) {
      order.direction = value;
      continue;
    }

    if (flexWrap.has(value.toLowerCase())) {
      order.wrap = value;
    }
  }
  return `${order.direction} ${order.wrap}`.trim();
}

export default normalizeFlexFlow;

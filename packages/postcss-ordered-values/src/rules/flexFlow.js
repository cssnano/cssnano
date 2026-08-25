const flexDirection = new Set([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);
const flexWrap = new Set(['nowrap', 'wrap', 'wrap-reverse']);

/** @param {import('@csstools/css-parser-algorithms').ComponentValue[]} flexFlow */
function normalizeFlexFlow(flexFlow) {
  const order = { direction: '', wrap: '' };
  for (const node of flexFlow) {
    const value = node.toString();
    if (flexDirection.has(value.toLowerCase())) order.direction = value;
    else if (flexWrap.has(value.toLowerCase())) order.wrap = value;
  }
  return `${order.direction} ${order.wrap}`.trim();
}

export default normalizeFlexFlow;

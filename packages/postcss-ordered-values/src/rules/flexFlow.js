'use strict';
// flex-flow: <flex-direction> || <flex-wrap>

const flexDirection = new Set([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);

const flexWrap = new Set(['nowrap', 'wrap', 'wrap-reverse']);

/**
 * @param {import('postcss-value-parser').ParsedValue} flexFlow
 * @return {string}
 */
module.exports = function normalizeFlexFlow(flexFlow) {
  const order = {
    direction: '',
    wrap: '',
  };

  flexFlow.walk(({ value }) => {
    if (flexDirection.has(value.toLowerCase())) {
      order.direction = value;
      return;
    }

    if (flexWrap.has(value.toLowerCase())) {
      order.wrap = value;
    }
  });

  return `${order.direction} ${order.wrap}`.trim();
};

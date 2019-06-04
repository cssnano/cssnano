// flex-flow: <flex-direction> || <flex-wrap>

import isNodeValueOneOf from '../lib/isNodeValueOneOf';

const isFlexDirection = isNodeValueOneOf([
  'row',
  'row-reverse',
  'column',
  'column-reverse',
]);

const isFlexWrap = isNodeValueOneOf(['nowrap', 'wrap', 'wrap-reverse']);

export default function normalizeFlexFlow(flexFlow) {
  let order = {
    direction: '',
    wrap: '',
  };

  flexFlow.walk((node) => {
    if (isFlexDirection(node)) {
      order.direction = node.value;
      return;
    }

    if (isFlexWrap(node)) {
      order.wrap = node.value;

      return;
    }
  });

  return `${order.direction} ${order.wrap}`.trim();
}

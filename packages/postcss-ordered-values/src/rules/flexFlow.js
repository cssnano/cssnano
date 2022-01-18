// flex-flow: <flex-direction> || <flex-wrap>

const flexDirection = ['row', 'row-reverse', 'column', 'column-reverse'];

const flexWrap = ['nowrap', 'wrap', 'wrap-reverse'];

export default function normalizeFlexFlow(flexFlow) {
  let order = {
    direction: '',
    wrap: '',
  };

  flexFlow.walk(({ value }) => {
    if (flexDirection.includes(value.toLowerCase())) {
      order.direction = value;
      return;
    }

    if (flexWrap.includes(value.toLowerCase())) {
      order.wrap = value;
      return;
    }
  });

  return `${order.direction} ${order.wrap}`.trim();
}

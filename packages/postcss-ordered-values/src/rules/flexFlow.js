// flex-flow: <flex-direction> || <flex-wrap>

const flexDirection = [
    'row',
    'row-reverse',
    'column',
    'column-reverse',
];

const flexWrap = [
    'nowrap',
    'wrap',
    'wrap-reverse',
];

export default function normalizeFlexFlow (decl, flexFlow) {
    let order = {
        direction: '',
        wrap: '',
    };
    flexFlow.walk(node => {
        if (~flexDirection.indexOf(node.value)) {
            order.direction = node.value;
            return;
        }
        if (~flexWrap.indexOf(node.value)) {
            order.wrap = node.value;
            return;
        }
    });
    decl.value = `${order.direction} ${order.wrap}`.trim();
};

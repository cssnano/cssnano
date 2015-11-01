import valueParser from 'postcss-value-parser';

// flex-flow: <flex-direction> || <flex-wrap>
const flexFlowProps = [
    'flex-flow'
];

const flexDirection = [
    'row',
    'row-reverse',
    'column',
    'column-reverse'
];

const flexWrap = [
    'nowrap ',
    'wrap',
    'wrap-reverse'
];

export default function normalizeFlexFlow (decl) {
    if (!~flexFlowProps.indexOf(decl.prop)) {
        return;
    }
    let order = {direction: '', wrap: ''};
    let flexFlow = valueParser(decl.value);
    if (flexFlow.nodes.length > 2) {
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
    }
};

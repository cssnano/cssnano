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
    let {value} = decl;
    if (decl.raws && decl.raws.value && decl.raws.value.raw) {
        value = decl.raws.value.raw;
    }
    let order = {direction: '', wrap: ''};
    let flexFlow = valueParser(value);
    let abort = false;
    if (flexFlow.nodes.length > 2) {
        flexFlow.walk(node => {
            if (node.type === 'comment') {
                abort = true;
                return;
            }
            if (~flexDirection.indexOf(node.value)) {
                order.direction = node.value;
                return;
            }
            if (~flexWrap.indexOf(node.value)) {
                order.wrap = node.value;
                return;
            }
        });
        if (!abort) {
            decl.value = `${order.direction} ${order.wrap}`.trim();
        }
    }
};

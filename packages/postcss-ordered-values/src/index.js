'use strict';

import postcss from 'postcss';
import valueParser, {unit, stringify} from 'postcss-value-parser';

// border: <line-width> || <line-style> || <color>
// outline: <outline-color> || <outline-style> || <outline-width>
const borderProps = [
    'border',
    'border-top',
    'border-right',
    'border-bottom',
    'border-left',
    'outline'
];

const borderWidths = [
    'thin',
    'medium',
    'thick'
];

const borderStyles = [
    'none',
    'auto', // only in outline-style
    'hidden',
    'dotted',
    'dashed',
    'solid',
    'double',
    'groove',
    'ridge',
    'inset',
    'outset'
];

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


function normalizeBorder (decl) {
    let order = {width: '', style: '', color: ''};
    let border = valueParser(decl.value);
    if (border.nodes.length > 2) {
        border.walk(node => {
            if (node.type === 'word') {
                if (~borderStyles.indexOf(node.value)) {
                    order.style = node.value;
                    return;
                }
                if (~borderWidths.indexOf(node.value) || unit(node.value)) {
                    order.width = node.value;
                    return;
                }
                order.color = node.value;
                return;
            }
            if (node.type === 'function') {
                if (node.value === 'calc') {
                    order.width = stringify(node);
                } else {
                    order.color = stringify(node);
                }
                return false;
            }
        });
        decl.value = `${order.width} ${order.style} ${order.color}`.trim();
    }
};

function normalizeFlexFlow (decl) {
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

export default postcss.plugin('postcss-ordered-values', () => {
    return css => {
        css.walkDecls(decl => {
            if (~borderProps.indexOf(decl.prop)) {
                normalizeBorder(decl);
                return;
            }
            if (~flexFlowProps.indexOf(decl.prop)) {
                normalizeFlexFlow(decl);
                return;
            }
        });
    };
});

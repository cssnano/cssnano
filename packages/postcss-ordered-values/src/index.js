'use strict';

import postcss from 'postcss';
import parser, {unit} from 'postcss-value-parser';

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
const flexFlowProps = 'flex-flow';

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


let normalizeBorder = decl => {
    if (!~borderProps.indexOf(decl.prop)) {
        return;
    }
    let order = {width: '', style: '', color: ''};
    let border = parser(decl.value);
    border = border.nodes.filter(n => n.type !== 'space');
    if (border.length > 1) {
        border.forEach(node => {
            let number = unit(node.value);
            if (number || ~borderWidths.indexOf(node.value)) {
                order.width = node.value + ' ';
                return;
            }
            if (~borderStyles.indexOf(node.value)) {
                order.style = node.value + ' ';
                return;
            }
            if (node.type === 'function') {
                let value = node.nodes.map(n => n.value).join('');
                order.color = `${node.value}(${value})`;
                return;
            }
            order.color = node.value;
        });
        decl.value = `${order.width}${order.style}${order.color}`.trim();
    }
};

let normalizeFlexFlow = decl => {
    if (!~flexFlowProps.indexOf(decl.prop)) {
        return;
    }
    let order = {direction: '', wrap: ''};
    let flexFlow = parser(decl.value);
    flexFlow = flexFlow.nodes.filter(n => n.type !== 'space');
    if (flexFlow.length > 1) {
        flexFlow.forEach(node => {
            if (~flexDirection.indexOf(node.value)) {
                order.direction = node.value + ' ';
                return;
            }
            if (~flexWrap.indexOf(node.value)) {
                order.wrap = node.value + ' ';
                return;
            }
        });
        decl.value = `${order.direction}${order.wrap}`.trim();
    }
};

export default postcss.plugin('postcss-ordered-values', () => {
    return css => {
        css.eachDecl(decl => {
            normalizeBorder(decl);
            normalizeFlexFlow(decl);
        });
    };
});

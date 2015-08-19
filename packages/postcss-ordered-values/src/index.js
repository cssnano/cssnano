'use strict';

import postcss from 'postcss';
import parser, {unit} from 'postcss-value-parser';

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

export default postcss.plugin('postcss-ordered-values', () => {
    return css => {
        css.eachDecl(decl => {
            normalizeBorder(decl);
        });
    };
});

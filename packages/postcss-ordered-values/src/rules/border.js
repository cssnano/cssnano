import {unit, stringify} from 'postcss-value-parser';

// border: <line-width> || <line-style> || <color>
// outline: <outline-color> || <outline-style> || <outline-width>

const borderWidths = [
    'thin',
    'medium',
    'thick',
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
    'outset',
];

export default function normalizeBorder (decl, border) {
    const order = {width: '', style: '', color: ''};
    border.walk(node => {
        const {type, value} = node;
        if (type === 'word') {
            if (~borderStyles.indexOf(value)) {
                order.style = value;
                return false;
            }
            if (~borderWidths.indexOf(value) || unit(value)) {
                order.width = value;
                return false;
            }
            order.color = value;
            return false;
        }
        if (type === 'function') {
            if (value === 'calc') {
                order.width = stringify(node);
            } else {
                order.color = stringify(node);
            }
            return false;
        }
    });
    decl.value = `${order.width} ${order.style} ${order.color}`.trim();
};

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

    const parts = getBorderParts(border, decl.value);
    const {width, style, color} = mergeWithInitialBorderParts(parts, order);
    decl.value = `${width} ${style} ${color}`.trim();
};

function mergeWithInitialBorderParts (parts, order) {
    const orderedValues = ['width', 'style', 'color'].map((key) => order[key]);
    const diff = parts.filter((part) => orderedValues.indexOf(part) === -1);
    const [width='', style='', color=''] = orderedValues.map((val) => val ? val : diff.shift());

    return {width, style, color};
}

function getBorderParts (border, originalValue) {
    const borderParts = [];
    let lastIndex = 0;
    border.walk(node => {
        if (node.type === 'space') {
            borderParts.push(originalValue.substring(lastIndex, node.sourceIndex));
            lastIndex = node.sourceIndex + 1;
        }
    });

    borderParts.push(originalValue.substring(lastIndex));

    return borderParts;
}

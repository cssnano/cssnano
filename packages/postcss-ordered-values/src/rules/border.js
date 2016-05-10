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

export default function normalizeBorder (decl) {
    if (!~borderProps.indexOf(decl.prop)) {
        return;
    }
    let {value} = decl;
    if (decl.raws && decl.raws.value && decl.raws.value.raw) {
        value = decl.raws.value.raw;
    }
    let order = {width: '', style: '', color: ''};
    let border = valueParser(value);
    let abort = false;
    if (border.nodes.length > 2) {
        border.walk(node => {
            if (node.type === 'comment') {
                abort = true;
                return false;
            }
            if (node.type === 'word') {
                if (~borderStyles.indexOf(node.value)) {
                    order.style = node.value;
                    return false;
                }
                if (~borderWidths.indexOf(node.value) || unit(node.value)) {
                    order.width = node.value;
                    return false;
                }
                order.color = node.value;
                return false;
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
        if (!abort) {
            decl.value = `${order.width} ${order.style} ${order.color}`.trim();
        }
    }
};

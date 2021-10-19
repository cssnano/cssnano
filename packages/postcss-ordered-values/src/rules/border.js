import { unit, stringify } from 'postcss-value-parser';

// border: <line-width> || <line-style> || <color>
// outline: <outline-color> || <outline-style> || <outline-width>

const borderWidths = ['thin', 'medium', 'thick'];

// All of the curently implemented math functions
const mathFunctions = ['calc', 'clamp', 'max', 'min'];

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

export default function normalizeBorder(border) {
  const order = { width: '', style: '', color: '' };

  border.walk((node) => {
    const { type, value } = node;
    if (type === 'word') {
      if (borderStyles.includes(value.toLowerCase())) {
        order.style = value;
        return false;
      }
      if (
        borderWidths.includes(value.toLowerCase()) ||
        unit(value.toLowerCase())
      ) {
        if (order.width !== '') {
          order.width = `${order.width} ${value}`;
          return false;
        }
        order.width = value;
        return false;
      }
      order.color = value;
      return false;
    }
    if (type === 'function') {
      if (mathFunctions.includes(value.toLowerCase())) {
        order.width = stringify(node);
      } else {
        order.color = stringify(node);
      }
      return false;
    }
  });

  return `${order.width} ${order.style} ${order.color}`.trim();
}

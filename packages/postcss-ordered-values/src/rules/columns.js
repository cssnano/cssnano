import { unit } from 'postcss-value-parser';
import border from './border.js';

function hasUnit(value) {
  const parsedVal = unit(value);
  return parsedVal && parsedVal.unit !== '';
}

export const column = (columns) => {
  const widths = [];
  const other = [];
  columns.walk((node) => {
    const { type, value } = node;
    if (type === 'word') {
      if (hasUnit(value)) {
        widths.push(value);
      } else {
        other.push(value);
      }
    }
  });

  // only transform if declaration is not invalid or a single value
  if (other.length === 1 && widths.length === 1) {
    return `${widths[0].trimStart()} ${other[0].trimStart()}`;
  }

  return columns;
};

export const columnsRule = border;

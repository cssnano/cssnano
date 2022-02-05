'use strict';
const { unit } = require('postcss-value-parser');

function hasUnit(value) {
  const parsedVal = unit(value);
  return parsedVal && parsedVal.unit !== '';
}

module.exports = (columns) => {
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

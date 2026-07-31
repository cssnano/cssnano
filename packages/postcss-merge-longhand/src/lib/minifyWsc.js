'use strict';
const parseWidthStyleColor = require('./parseWsc.js');
const minifyTopBottomRightLeft = require('./minifyTrbl.js');
const { isValidWidthStyleColor } = require('./validateWsc.js');

const defaultBorderValue = ['medium', 'none', 'currentcolor'];

/** @type {(cssPropertyValue: string) => string} */
module.exports = (cssPropertyValue) => {
  const values = parseWidthStyleColor(cssPropertyValue);

  if (!isValidWidthStyleColor(values)) {
    return minifyTopBottomRightLeft(cssPropertyValue);
  }

  const valuesWithSentinel = [...values, ''];
  let value = '';
  for (let i = valuesWithSentinel.length - 1; i >= 0; i--) {
    const cur = valuesWithSentinel[i];
    if (
      cur === undefined ||
      (cur.toLowerCase() === defaultBorderValue[i] &&
        (!i ||
          (valuesWithSentinel[i - 1] || '').toLowerCase() !==
            cur.toLowerCase()))
    ) {
      continue;
    }

    value = cur + ' ' + value;
  }
  value = value.trim();

  return minifyTopBottomRightLeft(value || 'none');
};

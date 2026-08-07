'use strict';
const parseWsc = require('./parseWsc.js');
const minifyTopBottomRightLeft = require('./minifyTrbl.js');
const { isValidWidthStyleColor } = require('./validateWsc.js');

const defaults = ['medium', 'none', 'currentcolor'];

/** @type {(v: string) => string} */
module.exports = (v) => {
  const values = parseWsc(v);

  if (!isValidWidthStyleColor(values)) {
    return minifyTopBottomRightLeft(v);
  }

  const valuesWithSentinel = [...values, ''];
  let value = '';
  for (let i = valuesWithSentinel.length - 1; i >= 0; i--) {
    const cur = valuesWithSentinel[i];
    if (
      cur === undefined ||
      (cur.toLowerCase() === defaults[i] &&
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

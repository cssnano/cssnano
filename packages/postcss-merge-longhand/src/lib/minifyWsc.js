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

  const value = [...values, '']
    .reduceRight((prev, cur, i, arr) => {
      if (
        cur === undefined ||
        (cur.toLowerCase() === defaults[i] &&
          (!i || (arr[i - 1] || '').toLowerCase() !== cur.toLowerCase()))
      ) {
        return prev;
      }

      return cur + ' ' + prev;
    })
    .trim();

  return minifyTopBottomRightLeft(value || 'none');
};

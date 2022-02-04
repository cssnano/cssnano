'use strict';
const parseWsc = require('./parseWsc');
const minifyTrbl = require('./minifyTrbl');
const { isValidWsc } = require('./validateWsc');

const defaults = ['medium', 'none', 'currentcolor'];

module.exports = (v) => {
  const values = parseWsc(v);

  if (!isValidWsc(values)) {
    return minifyTrbl(v);
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

  return minifyTrbl(value || 'none');
};

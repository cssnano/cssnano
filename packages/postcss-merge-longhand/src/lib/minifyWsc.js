import lowercaseEq from './lowercaseEq';
import parseWsc from './parseWsc';
import minifyTrbl from './minifyTrbl';
import { isValidWsc } from './validateWsc';

const defaults = ['medium', 'none', 'currentcolor'];

export default (v) => {
  const values = parseWsc(v);

  if (!isValidWsc(values)) {
    return minifyTrbl(v);
  }

  const value = [...values, '']
    .reduceRight((prev, cur, i, arr) => {
      if (
        cur === undefined ||
        (lowercaseEq(defaults[i], cur) &&
          (!i || (arr[i - 1] || '').toLowerCase() !== cur.toLowerCase()))
      ) {
        return prev;
      }

      return cur + ' ' + prev;
    })
    .trim();

  return minifyTrbl(value || 'none');
};

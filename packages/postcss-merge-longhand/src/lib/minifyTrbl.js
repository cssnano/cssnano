import parseTrbl, { fourSideCount } from './parseTrbl.js';

/**
 * @param {string | string[]} v
 * @return {string}
 */
export default (v) => {
  const value = parseTrbl(v);
  return value.slice(0, fourSideCount(value)).join(' ');
};

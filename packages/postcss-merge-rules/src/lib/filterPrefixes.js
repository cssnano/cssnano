import vendors from 'vendors';
import includedIn from './includedIn';

/** @type {string[]} */
const prefixes = vendors.map((v) => `-${v}-`);

/**
 * @param {string} selector
 * @return {string[]}
 */
function filterPrefixes(selector) {
  return prefixes.filter(includedIn(selector));
}

export default filterPrefixes;

const vendorPrefixRegex = /^(-\w+-)/v;

/**
 * A property name behind `_` or a single `-`, which only IE 6 reads.
 * @param {string} prop
 * @param {string | undefined} before the raw text before the declaration
 * @return {boolean}
 */
export default function leadingUnderscore(prop, before) {
  if (before?.includes('_')) {
    return true;
  }
  return prop[0] === '-' && prop[1] !== '-' && !vendorPrefixRegex.test(prop);
}

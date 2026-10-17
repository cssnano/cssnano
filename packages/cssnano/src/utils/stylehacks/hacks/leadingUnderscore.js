const vendorPrefixRegex = /^(-\w+-)/v;

/**
 * A property name behind `_` or a single `-`, which only IE 6 reads.
 * @param {import('postcss').Declaration} decl
 * @return {boolean}
 */
export default function leadingUnderscore(decl) {
  const { prop } = decl;
  if (decl.raws.before?.includes('_')) {
    return true;
  }
  return prop[0] === '-' && prop[1] !== '-' && !vendorPrefixRegex.test(prop);
}

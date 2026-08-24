const vendorPrefixRegex = /^-\w+-/;
/**
 * @param {string} prop
 * @return {string}
 */
function vendorUnprefixed(prop) {
  return prop.replace(vendorPrefixRegex, '');
}
export default vendorUnprefixed;

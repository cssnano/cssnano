const vendorPrefixRegex = /^-[A-Za-z0-9_]+-/v;
/**
 * @param {string} prop
 * @return {string}
 */
function vendorUnprefixed(prop) {
  return prop.replace(vendorPrefixRegex, '');
}
export default vendorUnprefixed;

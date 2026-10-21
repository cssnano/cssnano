// A vendor prefix is a hyphen, one or more ASCII word characters, and a hyphen.
const vendorPrefixPattern = /^-[A-Za-z0-9_]+-/v;

/**
 * Removes the leading vendor prefix of a property or function name, so that
 * `-webkit-transition` compares as `transition`. A custom property (`--x`) has
 * no prefix and is returned unchanged.
 *
 * @param {string} name
 * @return {string}
 */
export default function vendorUnprefixed(name) {
  return name.replace(vendorPrefixPattern, '');
}

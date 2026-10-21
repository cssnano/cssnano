/**
 * Removes a leading vendor prefix such as `-webkit-`: a hyphen, a run of
 * letters and a hyphen. A custom property name (`--x`) has none.
 *
 * @param {string} name - lowercased
 * @return {string}
 */
export function withoutVendorPrefix(name) {
  if (name[0] !== '-') return name;
  let end = 1;
  while (end < name.length && name[end] >= 'a' && name[end] <= 'z') end++;
  return end > 1 && name[end] === '-' ? name.slice(end + 1) : name;
}

const vendorPrefixes = new Set(
  [
    'ah',
    'apple',
    'atsc',
    'epub',
    'hp',
    'khtml',
    'moz',
    'ms',
    'o',
    'rim',
    'ro',
    'tc',
    'wap',
    'webkit',
    'xv',
  ].map((vendor) => `-${vendor}-`)
);

/**
 * The vendor prefix of a pseudo-class or pseudo-element name, such as
 * `-moz-` for `-moz-selection`; a prefix is meaningful only at the start of
 * an identifier, so `x-moz-y` has none.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {string} the prefix, or the empty string when there is none
 */
export function vendorPrefixOf(name) {
  if (name[0] !== '-') return '';
  const prefix = name.slice(0, name.indexOf('-', 1) + 1);
  return vendorPrefixes.has(prefix) ? prefix : '';
}

/**
 * Internet Explorer uses :-ms-input-placeholder.
 * Microsoft Edge uses ::-ms-input-placeholder.
 *
 * @param {string} name unescaped and in ASCII lower case
 * @return {boolean}
 */
export function isMsInputPlaceholder(name) {
  return name === '-ms-input-placeholder';
}

/**
 * What a selector list contributes to the vendor-prefix merge check.
 * `prefix` is the one vendor prefix shared by every selector: `null` for an
 * empty list, `''` when none is prefixed, and `undefined` when the list mixes
 * prefixed and unprefixed selectors or different prefixes. Merging a mixed
 * list would drop its unprefixed selectors from engines matching the prefixed
 * ones, and merging different prefixes drops rules from other engines.
 *
 * @typedef {{prefix: string | null | undefined, msPlaceholder: boolean}} VendorProfile
 */

/**
 * What one selector contributes: its vendor prefix, `''` when it has none and
 * `undefined` when unknown or when it mixes prefixes.
 *
 * @typedef {{prefix: string | undefined, msPlaceholder: boolean}} SelectorVendor
 */

/**
 * Folds one selector into a profile, so a growing list needs no rescan.
 *
 * @param {VendorProfile} profile
 * @param {SelectorVendor} selector the vendor facts of one selector;
 * an unknown `prefix` blocks every merge
 * @return {VendorProfile}
 */
export function addToVendorProfile(profile, selector) {
  const own = selector.prefix;
  if (profile.prefix === null) {
    profile.prefix = own;
  } else if (profile.prefix !== own) {
    profile.prefix = undefined;
  }
  profile.msPlaceholder ||= selector.msPlaceholder;
  return profile;
}

/**
 * The profile of one selector list followed by another, without rescanning.
 *
 * @param {VendorProfile} a
 * @param {VendorProfile} b
 * @return {VendorProfile}
 */
export function combineVendorProfiles(a, b) {
  let prefix = a.prefix;
  if (a.prefix === null) {
    prefix = b.prefix;
  } else if (b.prefix !== null && a.prefix !== b.prefix) {
    prefix = undefined;
  }
  return { prefix, msPlaceholder: a.msPlaceholder || b.msPlaceholder };
}

/**
 * @param {SelectorVendor[]} selectors
 * @return {VendorProfile}
 */
export function vendorProfile(selectors) {
  /** @type {VendorProfile} */
  const profile = { prefix: null, msPlaceholder: false };
  for (const selector of selectors) addToVendorProfile(profile, selector);
  return profile;
}

/** @param {VendorProfile} profile @return {boolean} */
function isUnprefixed({ prefix }) {
  return prefix === null || prefix === '';
}

/**
 * Whether two selector lists may share a rule: both unprefixed, or both
 * carrying the same single prefix, except that two `-ms-input-placeholder`
 * lists never merge because Edge and Internet Explorer disagree on the
 * pseudo's spelling.
 *
 * @param {VendorProfile} a
 * @param {VendorProfile} b
 * @return {boolean}
 */
export function vendorsAllowMerge(a, b) {
  if (isUnprefixed(a) && isUnprefixed(b)) return true;
  if (a.prefix === undefined || b.prefix === undefined) return false;
  return a.prefix === b.prefix && !(a.msPlaceholder && b.msPlaceholder);
}

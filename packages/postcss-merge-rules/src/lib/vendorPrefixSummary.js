/**
 * What one selector contributes: its vendor prefix, `''` when it has none and
 * `undefined` when unknown or when it mixes prefixes.
 *
 * @typedef {{prefix: string | undefined, msPlaceholder: boolean}} SelectorVendor
 */

/**
 * What a selector list contributes to the vendor-prefix merge check.
 * `prefix` is the one vendor prefix shared by every selector: `null` for an
 * empty list, `''` when none is prefixed, and `undefined` when the list mixes
 * prefixed and unprefixed selectors or different prefixes. Merging a mixed
 * list would drop its unprefixed selectors from engines matching the prefixed
 * ones, and merging different prefixes drops rules from other engines.
 */
export class VendorPrefixSummary {
  /** @type {string | null | undefined} */
  prefix;
  /** @type {boolean} */
  msPlaceholder;

  /**
   * @param {string | null | undefined} prefix
   * @param {boolean} msPlaceholder
   */
  constructor(prefix, msPlaceholder) {
    this.prefix = prefix;
    this.msPlaceholder = msPlaceholder;
  }

  /**
   * @param {SelectorVendor[]} selectors
   * @return {VendorPrefixSummary}
   */
  static of(selectors) {
    const profile = new VendorPrefixSummary(null, false);
    for (const selector of selectors) profile.add(selector);
    return profile;
  }

  /**
   * Folds one selector in place, so a growing list needs no rescan.
   *
   * @param {SelectorVendor} selector the vendor facts of one selector;
   * an unknown `prefix` blocks every merge
   */
  add(selector) {
    const own = selector.prefix;
    if (this.prefix === null) {
      this.prefix = own;
    } else if (this.prefix !== own) {
      this.prefix = undefined;
    }
    this.msPlaceholder ||= selector.msPlaceholder;
  }

  /**
   * The profile of this selector list followed by another, without
   * rescanning. Neither operand changes.
   *
   * @param {VendorPrefixSummary} other
   * @return {VendorPrefixSummary}
   */
  concat(other) {
    let prefix = this.prefix;
    if (this.prefix === null) {
      prefix = other.prefix;
    } else if (other.prefix !== null && this.prefix !== other.prefix) {
      prefix = undefined;
    }
    return new VendorPrefixSummary(
      prefix,
      this.msPlaceholder || other.msPlaceholder
    );
  }

  /** @return {boolean} */
  #isUnprefixed() {
    return this.prefix === null || this.prefix === '';
  }

  /**
   * Whether two selector lists may share a rule: both unprefixed, or both
   * carrying the same single prefix, except that two `-ms-input-placeholder`
   * lists never merge because Edge and Internet Explorer disagree on the
   * pseudo's spelling.
   *
   * @param {VendorPrefixSummary} other
   * @return {boolean}
   */
  allowsMerge(other) {
    if (this.#isUnprefixed() && other.#isUnprefixed()) return true;
    if (this.prefix === undefined || other.prefix === undefined) return false;
    return (
      this.prefix === other.prefix &&
      !(this.msPlaceholder && other.msPlaceholder)
    );
  }
}

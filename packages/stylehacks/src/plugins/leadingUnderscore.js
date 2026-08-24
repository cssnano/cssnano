import BasePlugin from '../plugin.js';
import { IE_6 } from '../dictionary/browsers.js';
import { PROPERTY } from '../dictionary/identifiers.js';
import { DECL } from '../dictionary/postcss.js';

const vendorPrefixRegex = /^(-\w+-)/;
/**
 * @param {string} prop
 * @return {string}
 */
function vendorPrefix(prop) {
  const match = prop.match(vendorPrefixRegex);
  if (match) {
    return match[0];
  }

  return '';
}
export default (class LeadingUnderscore extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super([IE_6], [DECL], result);
  }

  /**
   * @param {import('postcss').Declaration} decl
   * @return {void}
   */
  detect(decl) {
    const { before } = decl.raws;

    if (before && before.includes('_')) {
      this.push(decl, {
        identifier: PROPERTY,
        hack: `${before.trim()}${decl.prop}`,
      });
    }

    if (
      decl.prop[0] === '-' &&
      decl.prop[1] !== '-' &&
      vendorPrefix(decl.prop) === ''
    ) {
      this.push(decl, {
        identifier: PROPERTY,
        hack: decl.prop,
      });
    }
  }
});

import isMixin from '../isMixin.js';
import BasePlugin from '../plugin.js';
import { findRuleSelectorHacks } from '../lib/selectorScanner.js';
import { SELECTOR } from '../dictionary/identifiers.js';
import { RULE } from '../dictionary/postcss.js';

export default (class StarHtml extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super('stylehacks-star-html-ie5.5-6', [RULE], result);
  }

  /**
   * @param {import('postcss').Rule} rule
   * @return {void}
   */
  detect(rule) {
    if (isMixin(rule)) {
      return;
    }
    for (const hack of findRuleSelectorHacks(rule).selector['star-html']) {
      this.push(rule, { identifier: SELECTOR, hack });
    }
  }
});

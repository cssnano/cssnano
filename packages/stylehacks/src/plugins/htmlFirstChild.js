import isMixin from '../isMixin.js';
import BasePlugin from '../plugin.js';
import { findRuleSelectorHacks } from '../lib/selectorScanner.js';
import { OP_9 } from '../dictionary/browsers.js';
import { SELECTOR } from '../dictionary/identifiers.js';
import { RULE } from '../dictionary/postcss.js';

export default (class HtmlFirstChild extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super([OP_9], [RULE], result);
  }

  /**
   * @param {import('postcss').Rule} rule
   * @return {void}
   */
  detect(rule) {
    if (isMixin(rule)) {
      return;
    }

    for (const hack of findRuleSelectorHacks(rule).selector[
      'html-first-child'
    ]) {
      this.push(rule, { identifier: SELECTOR, hack });
    }
  }
});

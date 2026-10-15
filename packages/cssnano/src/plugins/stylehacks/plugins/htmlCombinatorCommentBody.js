import isMixin from '../isMixin.js';
import BasePlugin from '../plugin.js';
import { findRuleSelectorHacks } from '../lib/selectorScanner.js';
import { SELECTOR } from '../dictionary/identifiers.js';
import { RULE } from '../dictionary/postcss.js';

export default (class HtmlCombinatorCommentBody extends BasePlugin {
  /** @param {import('postcss').Result=} result */
  constructor(result) {
    super('stylehacks-html-combinator-comment-body-ie5.5-7', [RULE], result);
  }

  /**
   * @param {import('postcss').Rule} rule
   * @return {void}
   */
  detect(rule) {
    if (isMixin(rule)) {
      return;
    }
    if (rule.raws.selector && rule.raws.selector.raw) {
      const rawResults = findRuleSelectorHacks(rule).raw;
      if (rawResults) {
        for (const hack of rawResults['html-comment-body']) {
          this.push(rule, { identifier: SELECTOR, hack });
        }
      }
    }
  }
});

import parser from 'postcss-selector-parser';
import exists from '../exists.js';
import isMixin from '../isMixin.js';
import BasePlugin from '../plugin.js';
import { FF_2 } from '../dictionary/browsers.js';
import { SELECTOR } from '../dictionary/identifiers.js';
import { RULE } from '../dictionary/postcss.js';
import { BODY } from '../dictionary/tags.js';

export default (class BodyEmpty extends BasePlugin {
  /** @param {import('postcss').Result} result */
  constructor(result) {
    super([FF_2], [RULE], result);
  }

  /**
   * @param {import('postcss').Rule} rule
   * @return {void}
   */
  detect(rule) {
    if (isMixin(rule)) {
      return;
    }
    parser(this.analyse(rule)).processSync(rule.selector);
  }

  /**
   * @param {import('postcss').Rule} rule
   * @return {parser.SyncProcessor<void>}
   */
  analyse(rule) {
    return (selectors) => {
      selectors.each((selector) => {
        if (
          exists(selector, 0, BODY) &&
          exists(selector, 1, ':empty') &&
          exists(selector, 2, ' ') &&
          selector.at(3)
        ) {
          this.push(rule, {
            identifier: SELECTOR,
            hack: selector.toString(),
          });
        }
      });
    };
  }
});

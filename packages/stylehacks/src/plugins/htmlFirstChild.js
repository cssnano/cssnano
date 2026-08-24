import parser from 'postcss-selector-parser';
import exists from '../exists.js';
import isMixin from '../isMixin.js';
import BasePlugin from '../plugin.js';
import { OP_9 } from '../dictionary/browsers.js';
import { SELECTOR } from '../dictionary/identifiers.js';
import { RULE } from '../dictionary/postcss.js';
import { HTML } from '../dictionary/tags.js';

export default (class HtmlFirstChild extends BasePlugin {
  /** @param {import('postcss').Result} result */
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
          exists(selector, 0, HTML) &&
          exists(selector, 1, ':first-child') &&
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

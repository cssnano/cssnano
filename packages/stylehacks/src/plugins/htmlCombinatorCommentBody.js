import parser from 'postcss-selector-parser';
import exists from '../exists.js';
import isMixin from '../isMixin.js';
import BasePlugin from '../plugin.js';
import { IE_5_5, IE_6, IE_7 } from '../dictionary/browsers.js';
import { SELECTOR } from '../dictionary/identifiers.js';
import { RULE } from '../dictionary/postcss.js';
import { BODY, HTML } from '../dictionary/tags.js';

export default (class HtmlCombinatorCommentBody extends BasePlugin {
  /** @param {import('postcss').Result} result */
  constructor(result) {
    super([IE_5_5, IE_6, IE_7], [RULE], result);
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
      try {
        parser(this.analyse(rule)).processSync(rule.raws.selector.raw);
      } catch {
        // v8 rejects malformed legacy hack selectors; they are not analyzable.
      }
    }
  }

  /** @param {import('postcss').Rule} rule
   *  @return {(selectors: parser.Root) => void}
   */
  analyse(rule) {
    return (selectors) => {
      selectors.each((selector) => {
        if (
          exists(selector, 0, HTML) &&
          (exists(selector, 1, '>') || exists(selector, 1, '~')) &&
          selector.at(2) &&
          selector.at(2).type === 'comment' &&
          exists(selector, 3, ' ') &&
          exists(selector, 4, BODY) &&
          exists(selector, 5, ' ') &&
          selector.at(6)
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

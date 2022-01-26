import parser from 'postcss-selector-parser';
import exists from '../exists';
import isMixin from '../isMixin';
import BasePlugin from '../plugin';
import { OP_9 } from '../dictionary/browsers';
import { SELECTOR } from '../dictionary/identifiers';
import { RULE } from '../dictionary/postcss';
import { HTML } from '../dictionary/tags';

export default class HtmlFirstChild extends BasePlugin {
  constructor(result) {
    super([OP_9], [RULE], result);
  }

  detect(rule) {
    if (isMixin(rule)) {
      return;
    }

    parser(this.analyse(rule)).processSync(rule.selector);
  }

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
}

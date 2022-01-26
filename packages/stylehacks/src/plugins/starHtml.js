import parser from 'postcss-selector-parser';
import exists from '../exists';
import isMixin from '../isMixin';
import BasePlugin from '../plugin';
import { IE_5_5, IE_6 } from '../dictionary/browsers';
import { SELECTOR } from '../dictionary/identifiers';
import { RULE } from '../dictionary/postcss';
import { HTML } from '../dictionary/tags';

export default class StarHtml extends BasePlugin {
  constructor(result) {
    super([IE_5_5, IE_6], [RULE], result);
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
          exists(selector, 0, '*') &&
          exists(selector, 1, ' ') &&
          exists(selector, 2, HTML) &&
          exists(selector, 3, ' ') &&
          selector.at(4)
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

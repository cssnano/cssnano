import parser from 'postcss-selector-parser';
import exists from '../exists';
import isMixin from '../isMixin';
import BasePlugin from '../plugin';
import { FF_2 } from '../dictionary/browsers';
import { SELECTOR } from '../dictionary/identifiers';
import { RULE } from '../dictionary/postcss';
import { BODY } from '../dictionary/tags';

export default class BodyEmpty extends BasePlugin {
  constructor(result) {
    super([FF_2], [RULE], result);
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
}

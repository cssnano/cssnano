import parser from 'postcss-selector-parser';
import exists from '../exists';
import isMixin from '../isMixin';
import plugin from '../plugin';
import { IE_5_5, IE_6 } from '../dictionary/browsers';
import { SELECTOR } from '../dictionary/identifiers';
import { RULE } from '../dictionary/postcss';
import { HTML } from '../dictionary/tags';

function analyse(ctx, rule) {
  return (selectors) => {
    selectors.each((selector) => {
      if (
        exists(selector, 0, '*') &&
        exists(selector, 1, ' ') &&
        exists(selector, 2, HTML) &&
        exists(selector, 3, ' ') &&
        selector.at(4)
      ) {
        ctx.push(rule, {
          identifier: SELECTOR,
          hack: selector.toString(),
        });
      }
    });
  };
}

export default plugin([IE_5_5, IE_6], [RULE], function (rule) {
  if (isMixin(rule)) {
    return;
  }

  parser(analyse(this, rule)).processSync(rule.selector);
});

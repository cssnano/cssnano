import parser from 'postcss-selector-parser';
import exists from '../exists';
import plugin from '../plugin';
import {FF_2} from '../dictionary/browsers';
import {SELECTOR} from '../dictionary/identifiers';
import {RULE} from '../dictionary/postcss';
import {BODY} from '../dictionary/tags';

function analyse (ctx, rule) {
    return selectors => {
        selectors.each(selector => {
            if (
                exists(selector, 0, BODY) &&
                exists(selector, 1, ':empty') &&
                exists(selector, 2, ' ') &&
                selector.at(3)
            ) {
                ctx.push(rule, {
                    identifier: SELECTOR,
                    hack: selector.toString(),
                });
            }
        });
    };
}

export default plugin([FF_2], [RULE], function (rule) {
    if (rule.selector) {
        parser(analyse(this, rule)).process(rule.selector);
    }
});

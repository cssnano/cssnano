import parser from 'postcss-selector-parser';
import exists from '../exists';
import isMixin from '../isMixin';
import plugin from '../plugin';
import {OP_9} from '../dictionary/browsers';
import {SELECTOR} from '../dictionary/identifiers';
import {RULE} from '../dictionary/postcss';
import {HTML} from '../dictionary/tags';

function analyse (ctx, rule) {
    return selectors => {
        selectors.each(selector => {
            if (
                exists(selector, 0, HTML) &&
                exists(selector, 1, ':first-child') &&
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

export default plugin([OP_9], [RULE], function (rule) {
    if (isMixin(rule)) {
        return;
    }
    parser(analyse(this, rule)).process(rule.selector);
});

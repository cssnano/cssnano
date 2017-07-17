import parser from 'postcss-selector-parser';
import exists from '../exists';
import isMixin from '../isMixin';
import plugin from '../plugin';
import {IE_5_5, IE_6, IE_7} from '../dictionary/browsers';
import {SELECTOR} from '../dictionary/identifiers';
import {RULE} from '../dictionary/postcss';
import {BODY, HTML} from '../dictionary/tags';

function analyse (ctx, rule) {
    return selectors => {
        selectors.each(selector => {
            if (
                exists(selector, 0, HTML) &&
                (exists(selector, 1, '>') || exists(selector, 1, '~')) &&
                selector.at(2) && selector.at(2).type === 'comment' &&
                exists(selector, 3, ' ') &&
                exists(selector, 4, BODY) &&
                exists(selector, 5, ' ') &&
                selector.at(6)
            ) {
                ctx.push(rule, {
                    identifier: SELECTOR,
                    hack: selector.toString(),
                });
            }
        });
    };
}

export default plugin([IE_5_5, IE_6, IE_7], [RULE], function (rule) {
    if (isMixin(rule)) {
        return;
    }
    if (rule.raws.selector && rule.raws.selector.raw) {
        parser(analyse(this, rule)).processSync(rule.raws.selector.raw);
    }
});

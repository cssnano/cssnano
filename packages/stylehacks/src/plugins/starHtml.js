import exists from '../exists';
import plugin from '../plugin';
import parser from 'postcss-selector-parser';

let targets = ['ie 6', 'ie 5.5'];

function analyse (ctx, rule) {
    return selectors => {
        selectors.each(selector => {
            if (
                exists(selector, 0, '*') &&
                exists(selector, 1, ' ') &&
                exists(selector, 2, 'html') &&
                exists(selector, 3, ' ') &&
                selector.at(4)
            ) {
                ctx.push(rule, `Bad selector: ${selector}`);
            }
        });
    };
}

export default plugin(targets, ['rule'], function (rule) {
    if (rule.selector) {
        parser(analyse(this, rule)).process(rule.selector);
    }
});

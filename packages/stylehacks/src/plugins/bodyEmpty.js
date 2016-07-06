import parser from 'postcss-selector-parser';
import exists from '../exists';
import plugin from '../plugin';

const targets = ['firefox 2'];

function analyse (ctx, rule) {
    return selectors => {
        selectors.each(selector => {
            if (
                exists(selector, 0, 'body') &&
                exists(selector, 1, ':empty') &&
                exists(selector, 2, ' ') &&
                selector.at(3)
            ) {
                ctx.push(rule, {
                    identifier: 'selector',
                    hack: selector.toString(),
                });
            }
        });
    };
}

export default plugin(targets, ['rule'], function (rule) {
    if (rule.selector) {
        parser(analyse(this, rule)).process(rule.selector);
    }
});

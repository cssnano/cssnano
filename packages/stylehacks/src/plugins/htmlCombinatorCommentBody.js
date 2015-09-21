'use strict';

import exists from '../exists';
import plugin from '../plugin';
import parser from 'postcss-selector-parser';

let targets = ['ie 7', 'ie 6', 'ie 5.5'];

function analyse (ctx, rule) {
    return selectors => {
        selectors.each(selector => {
            if (
                exists(selector, 0, 'html') &&
                (exists(selector, 1, '>') || exists(selector, 1, '~')) &&
                selector.at(2) && selector.at(2).type === 'comment' &&
                exists(selector, 3, ' ') &&
                exists(selector, 4, 'body') &&
                exists(selector, 5, ' ') &&
                selector.at(6)
            ) {
                ctx.push(rule, `Bad selector: ${selector}`);
            }
        });
    };
}

export default plugin(targets, function () {
    this.css.walkRules(rule => {
        if (rule.selector && rule.raws.selector && rule.raws.selector.raw) {
            parser(analyse(this, rule)).process(rule.raws.selector.raw);
        }
    });
});

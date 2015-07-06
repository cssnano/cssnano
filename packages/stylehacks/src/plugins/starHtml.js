'use strict';

import plugin from '../plugin';
import parser from 'postcss-selector-parser';

let hack = 'stylehacks-star-html';
let targets = ['ie 6', 'ie 5.5'];

function exists (selector, index, value) {
    let node = selector.at(index);
    return node && node.value === value;
}

function analyse (ctx, rule) {
    return function (selectors) {
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

export default plugin(hack, targets, function () {
    this.css.eachRule(rule => {
        if (rule.selector) {
            parser(analyse(this, rule)).process(rule.selector);
        }
    });
});

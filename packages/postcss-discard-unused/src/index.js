'use strict';

import uniqs from 'uniqs';
import postcss, {list} from 'postcss';
import flatten from 'flatten';

let {comma: comma, space: space} = list;

let filterAtRule = (css, properties, atrule) => {
    let atRules = [];
    let values = [];
    css.walk(node => {
        if (node.type === 'decl' && properties.test(node.prop)) {
            return comma(node.value).forEach(val => values.push(space(val)));
        }
        if (node.type === 'atrule') {
            if (typeof atrule === 'string' && node.name === atrule) {
                atRules.push(node);
            } else if (atrule instanceof RegExp && atrule.test(node.name)) {
                atRules.push(node);
            }
        }
    });
    values = uniqs(flatten(values));
    atRules.forEach(node => {
        let hasAtRule = values.some(value => value === node.params);
        if (!hasAtRule) {
            node.remove();
        }
    });
};

let hasFont = (fontFamily, cache) => {
    return comma(fontFamily).some(font => cache.some(c => ~c.indexOf(font)));
};

module.exports = postcss.plugin('postcss-discard-unused', () => {
    return css => {
        // fonts have slightly different logic
        let atRules = [];
        let values = [];
        css.walk(node => {
            if (node.type === 'decl' &&
                node.parent.type === 'rule' &&
                /font(|-family)/.test(node.prop)
            ) {
                return values.push(comma(node.value));
            }
            if (node.type === 'atrule' && node.name === 'font-face' && node.nodes) {
                atRules.push(node);
            }
        });
        values = uniqs(flatten(values));
        atRules.forEach(rule => {
            let families = rule.nodes.filter(node => node.prop === 'font-family');
            // Discard the @font-face if it has no font-family
            if (!families.length) {
                return rule.remove();
            }
            families.forEach(family => {
                if (!hasFont(family.value, values)) {
                    rule.remove();
                }
            });
        });

        // keyframes & counter styles
        filterAtRule(css, /list-style|system/, 'counter-style');
        filterAtRule(css, /animation/, /keyframes/);
    };
});

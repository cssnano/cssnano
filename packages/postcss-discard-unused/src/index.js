import uniqs from 'uniqs';
import {list, plugin} from 'postcss';
import flatten from 'flatten';

const {comma, space} = list;

function filterAtRule (css, declRegex, atruleRegex) {
    const atRules = [];
    let values = [];
    css.walk(node => {
        if (node.type === 'decl' && declRegex.test(node.prop)) {
            return comma(node.value).forEach(val => values.push(space(val)));
        }
        if (node.type === 'atrule' && atruleRegex.test(node.name)) {
            atRules.push(node);
        }
    });
    values = uniqs(flatten(values));
    atRules.forEach(node => {
        let hasAtRule = values.some(value => value === node.params);
        if (!hasAtRule) {
            node.remove();
        }
    });
}

function hasFont (fontFamily, cache) {
    return comma(fontFamily).some(font => cache.some(c => ~c.indexOf(font)));
}

function filterNamespace (css) {
    const atRules = [];
    let rules = [];
    css.walk(node => {
        const {type, selector, name} = node;
        if (type === 'rule' && /\|/.test(selector)) {
            return rules.push(selector.split('|')[0]);
        }
        if (type === 'atrule' && name === 'namespace') {
            atRules.push(node);
        }
    });
    rules = uniqs(flatten(rules));
    atRules.forEach(atRule => {
        const {0: param, length: len} = atRule.params.split(' ').filter(Boolean);
        if (len === 1) {
            return;
        }
        const hasRule = rules.some(rule => rule === param || rule === '*');
        if (!hasRule) {
            atRule.remove();
        }
    });
}

// fonts have slightly different logic
function filterFont (css) {
    const atRules = [];
    let values = [];
    css.walk(node => {
        if (
            node.type === 'decl' &&
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
}

export default plugin('postcss-discard-unused', opts => {
    const {fontFace, counterStyle, keyframes, namespace} = {
        fontFace: true,
        counterStyle: true,
        keyframes: true,
        namespace: true,
        ...opts,
    };
    return css => {
        if (fontFace) {
            filterFont(css);
        }
        if (counterStyle) {
            filterAtRule(css, /list-style|system/, /counter-style/);
        }
        if (keyframes) {
            filterAtRule(css, /animation/, /keyframes/);
        }
        if (namespace) {
            filterNamespace(css);
        }
    };
});

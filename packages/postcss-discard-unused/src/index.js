import uniqs from 'uniqs';
import postcss, {list} from 'postcss';
import flatten from 'flatten';

let {comma, space} = list;

function filterAtRule (css, declRegex, atruleRegex) {
    let atRules = [];
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
    let atRules = [];
    let rules = [];
    css.walk(node => {
        let {type, selector, name} = node;
        if (type === 'rule' && /\|/.test(selector)) {
            return rules.push(selector.split('|')[0]);
        }
        if (type === 'atrule' && name === 'namespace') {
            atRules.push(node);
        }
    });
    rules = uniqs(flatten(rules));
    atRules.forEach(atRule => {
        let {0: param, length: len} = atRule.params
            .split(' ')
            .filter(e => e !== '');
        if (len === 1) {
            return;
        }
        let hasRule = rules.some(rule => rule === param || rule === '*');
        if (!hasRule) {
            atRule.remove();
        }
    });
}

// fonts have slightly different logic
function filterFont (css) {
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
}

module.exports = postcss.plugin('postcss-discard-unused', opts => {
    opts = opts || {};
    return css => {
        if (opts.fontFace !== false) {
            filterFont(css);
        }
        if (opts.counterStyle !== false) {
            filterAtRule(css, /list-style|system/, /counter-style/);
        }
        if (opts.keyframes !== false) {
            filterAtRule(css, /animation/, /keyframes/);
        }
        if (opts.namespace !== false) {
            filterNamespace(css);
        }
    };
});

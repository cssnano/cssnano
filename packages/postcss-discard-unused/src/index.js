import uniqs from 'uniqs';
import {list, plugin} from 'postcss';

const {comma, space} = list;

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';

function filterAtRule (css, declRegex, atruleRegex) {
    const atRules = [];
    let values = [];
    css.walk(node => {
        const {type} = node;
        if (type === decl && declRegex.test(node.prop)) {
            values = comma(node.value).reduce((memo, value) => {
                return [...memo, ...space(value)];
            }, values);
        }
        if (type === atrule && atruleRegex.test(node.name)) {
            atRules.push(node);
        }
    });
    values = uniqs(values);
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
        if (type === rule && ~selector.indexOf('|')) {
            rules = rules.concat(selector.split('|')[0]);
        }
        if (type === atrule && name === 'namespace') {
            atRules.push(node);
        }
    });
    rules = uniqs(rules);
    atRules.forEach(atRule => {
        const {0: param, length: len} = atRule.params.split(' ').filter(Boolean);
        if (len === 1) {
            return;
        }
        const hasRule = rules.some(r => r === param || r === '*');
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
        const {type} = node;
        if (
            type === decl &&
            node.parent.type === rule &&
            /font(|-family)/.test(node.prop)
        ) {
            values = values.concat(comma(node.value));
        }
        if (type === atrule && node.name === 'font-face' && node.nodes) {
            atRules.push(node);
        }
    });
    values = uniqs(values);
    atRules.forEach(r => {
        let families = r.nodes.filter(({prop}) => prop === 'font-family');
        // Discard the @font-face if it has no font-family
        if (!families.length) {
            return r.remove();
        }
        families.forEach(family => {
            if (!hasFont(family.value, values)) {
                r.remove();
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

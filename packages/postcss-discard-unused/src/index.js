import uniqs from 'uniqs';
import {list, plugin} from 'postcss';

const {comma, space} = list;

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';

function addValues (cache, {value}) {
    return comma(value).reduce((memo, val) => [...memo, ...space(val)], cache);
}

function filterAtRule ({atRules, values}) {
    values = uniqs(values);
    atRules.forEach(node => {
        const hasAtRule = values.some(value => value === node.params);
        if (!hasAtRule) {
            node.remove();
        }
    });
}

function filterNamespace ({atRules, rules}) {
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

function hasFont (fontFamily, cache) {
    return comma(fontFamily).some(font => cache.some(c => ~c.indexOf(font)));
}

// fonts have slightly different logic
function filterFont ({atRules, values}) {
    values = uniqs(values);
    atRules.forEach(r => {
        const families = r.nodes.filter(({prop}) => prop === 'font-family');
        // Discard the @font-face if it has no font-family
        if (!families.length) {
            return r.remove();
        }
        families.forEach(family => {
            if (!hasFont(family.value.toLowerCase(), values)) {
                r.remove();
            }
        });
    });
}

export default plugin('postcss-discard-unused', opts => {
    const {fontFace, counterStyle, keyframes, namespace} = Object.assign({}, {
        fontFace: true,
        counterStyle: true,
        keyframes: true,
        namespace: true,
    }, opts);
    return css => {
        const counterStyleCache = {atRules: [], values: []};
        const keyframesCache = {atRules: [], values: []};
        const namespaceCache = {atRules: [], rules: []};
        const fontCache = {atRules: [], values: []};
        css.walk(node => {
            const {type, prop, selector, name} = node;
            if (type === rule && namespace && ~selector.indexOf('|')) {
                namespaceCache.rules = namespaceCache.rules.concat(selector.split('|')[0]);
                return;
            }
            if (type === decl) {
                if (counterStyle && /list-style|system/.test(prop)) {
                    counterStyleCache.values = addValues(counterStyleCache.values, node);
                }
                if (fontFace && node.parent.type === rule && /font(|-family)/.test(prop)) {
                    fontCache.values = fontCache.values.concat(comma(node.value.toLowerCase()));
                }
                if (keyframes && /animation/.test(prop)) {
                    keyframesCache.values = addValues(keyframesCache.values, node);
                }
                return;
            }
            if (type === atrule) {
                if (counterStyle && /counter-style/.test(name)) {
                    counterStyleCache.atRules.push(node);
                }
                if (fontFace && name === 'font-face' && node.nodes) {
                    fontCache.atRules.push(node);
                }
                if (keyframes && /keyframes/.test(name)) {
                    keyframesCache.atRules.push(node);
                }
                if (namespace && name === 'namespace') {
                    namespaceCache.atRules.push(node);
                }
                return;
            }
        });
        counterStyle && filterAtRule(counterStyleCache);
        fontFace     && filterFont(fontCache);
        keyframes    && filterAtRule(keyframesCache);
        namespace    && filterNamespace(namespaceCache);
    };
});

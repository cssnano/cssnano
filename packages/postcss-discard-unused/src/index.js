import uniqs from 'uniqs';
import {list, plugin} from 'postcss';
import selectorParser from 'postcss-selector-parser';
import parseFontNames from './parseFontNames';

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

// fonts have slightly different logic
function filterFont ({atRules, values}) {
    values = uniqs(values);
    atRules.forEach(r => {
        const fontFamilyRule = r.nodes.find(({prop}) => prop === 'font-family');
        const fontNames = fontFamilyRule && parseFontNames(fontFamilyRule);
        // Discard the @font-face if it has no font-family rule or if it is unused
        if (!fontFamilyRule || !fontNames.some(fontName => values.includes(fontName))) {
            r.remove();
        }
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
                if (~selector.indexOf('[')) {
                    // Attribute selector, so we should parse further.
                    selectorParser(ast => {
                        ast.walkAttributes(({namespace: ns}) => {
                            namespaceCache.rules = namespaceCache.rules.concat(
                                ns
                            );
                        });
                    }).process(selector);
                } else {
                    // Use a simple split function for the namespace
                    namespaceCache.rules = namespaceCache.rules.concat(
                        selector.split('|')[0]
                    );
                }
                return;
            }
            if (type === decl) {
                if (counterStyle && /list-style|system/.test(prop)) {
                    counterStyleCache.values = addValues(counterStyleCache.values, node);
                }
                if (fontFace && node.parent.type === rule && /font(|-family)/.test(prop)) {
                    fontCache.values.push(...parseFontNames(node));
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

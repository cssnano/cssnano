import valueParser, {unit, walk} from 'postcss-value-parser';
import postcss from 'postcss';
import encode from './lib/encode';

function isNum (node) {
    return unit(node.value);
}

function transformAtRule (css, atRuleRegex, propRegex) {
    const cache = {};
    const ruleCache = [];
    const declCache = [];
    // Encode at rule names and cache the result
    css.walk(node => {
        if (node.type === 'atrule' && atRuleRegex.test(node.name)) {
            if (!cache[node.params]) {
                cache[node.params] = {
                    ident: encode(Object.keys(cache).length),
                    count: 0
                };
            }
            node.params = cache[node.params].ident;
            ruleCache.push(node);
        } else if (node.type === 'decl' && propRegex.test(node.prop)) {
            declCache.push(node);
        }
    });
    // Iterate each property and change their names
    declCache.forEach(decl => {
        decl.value = valueParser(decl.value).walk(node => {
            if (node.type === 'word' && node.value in cache) {
                cache[node.value].count++;
                node.value = cache[node.value].ident;
            } else if (node.type === 'space') {
                node.value = ' ';
            } else if (node.type === 'div') {
                node.before = node.after = '';
            }
        }).toString();
    });
    // Ensure that at rules with no references to them are left unchanged
    ruleCache.forEach(rule => {
        Object.keys(cache).forEach(key => {
            let k = cache[key];
            if (k.ident === rule.params && !k.count) {
                rule.params = key;
            }
        });
    });
}

function transformDecl (css, propOneRegex, propTwoRegex) {
    const cache = {};
    const declOneCache = [];
    const declTwoCache = [];
    css.walkDecls(decl => {
        if (propOneRegex.test(decl.prop)) {
            decl.value = valueParser(decl.value).walk(node => {
                if (node.type === 'word' && !isNum(node)) {
                    if (!cache[node.value]) {
                        cache[node.value] = {
                            ident: encode(Object.keys(cache).length),
                            count: 0
                        };
                    }
                    node.value = cache[node.value].ident;
                } else if (node.type === 'space') {
                    node.value = ' ';
                }
            });
            declOneCache.push(decl);
        } else if (propTwoRegex.test(decl.prop)) {
            declTwoCache.push(decl);
        }
    });
    declTwoCache.forEach(decl => {
        decl.value = valueParser(decl.value).walk(node => {
            if (node.type === 'function') {
                if (node.value === 'counter' || node.value === 'counters') {
                    walk(node.nodes, n => {
                        if (n.type === 'word' && n.value in cache) {
                            cache[n.value].count++;
                            n.value = cache[n.value].ident;
                        } else if (n.type === 'div') {
                            n.before = n.after = '';
                        }
                    });
                }
                return false;
            }
            if (node.type === 'space') {
                node.value = ' ';
            }
        }).toString();
    });
    declOneCache.forEach(decl => {
        decl.value = decl.value.walk(node => {
            if (node.type === 'word' && !isNum(node)) {
                Object.keys(cache).forEach(key => {
                    let k = cache[key];
                    if (k.ident === node.value && !k.count) {
                        node.value = key;
                    }
                });
            }
        }).toString();
    });
}

export default postcss.plugin('postcss-reduce-idents', (opts = {}) => {
    return css => {
        if (opts.counter !== false) {
            transformDecl(css, /counter-(reset|increment)/, /content/);
        }
        if (opts.keyframes !== false) {
            transformAtRule(css, /keyframes/, /animation/);
        }
        if (opts.counterStyle !== false) {
            transformAtRule(css, /counter-style/, /(list-style|system)/);
        }
    };
});

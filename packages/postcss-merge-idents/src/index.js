import has from 'has';
import {plugin} from 'postcss';
import valueParser from 'postcss-value-parser';

function canonical (obj) {
    // Prevent potential infinite loops
    let stack = 50;
    return function recurse (key) {
        if (has(obj, key) && obj[key] !== key && stack) {
            stack --;
            return recurse(obj[key]);
        }
        stack = 50;
        return key;
    };
}

function sameParent (ruleA, ruleB) {
    let hasParent = ruleA.parent && ruleB.parent;
    let sameType = hasParent && ruleA.parent.type === ruleB.parent.type;
    // If an at rule, ensure that the parameters are the same
    if (hasParent && ruleA.parent.type !== 'root' && ruleB.parent.type !== 'root') {
        sameType = sameType &&
                   ruleA.parent.params === ruleB.parent.params &&
                   ruleA.parent.name === ruleB.parent.name;
    }
    return hasParent ? sameType : true;
}

function mergeAtRules (css, pairs) {
    pairs.forEach(pair => {
        pair.cache = [];
        pair.replacements = [];
        pair.decls = [];
    });

    let relevant;

    css.walk(node => {
        if (node.type === 'atrule') {
            relevant = pairs.filter(pair => pair.atrule.test(node.name))[0];
            if (!relevant) {
                return;
            }
            if (relevant.cache.length < 1) {
                relevant.cache.push(node);
                return;
            } else {
                let toString = node.nodes.toString();
                relevant.cache.forEach(cached => {
                    if (
                        cached.name === node.name &&
                        sameParent(cached, node) &&
                        cached.nodes.toString() === toString
                    ) {
                        cached.remove();
                        relevant.replacements[cached.params] = node.params;
                    }
                });
                relevant.cache.push(node);
                return;
            }
        }
        if (node.type === 'decl') {
            relevant = pairs.filter(pair => pair.decl.test(node.prop))[0];
            if (!relevant) {
                return;
            }
            relevant.decls.push(node);
        }
    });

    pairs.forEach(pair => {
        let canon = canonical(pair.replacements);
        pair.decls.forEach(decl => {
            decl.value = valueParser(decl.value).walk(node => {
                if (node.type === 'word') {
                    node.value = canon(node.value);
                }
                if (node.type === 'space') {
                    node.value = ' ';
                }
                if (node.type === 'div') {
                    node.before = node.after = '';
                }
            }).toString();
        });
    });
}

export default plugin('postcss-merge-idents', () => {
    return css => {
        mergeAtRules(css, [{
            atrule: /keyframes/,
            decl: /animation/,
        }, {
            atrule: /counter-style/,
            decl: /(list-style|system)/,
        }]);
    };
});

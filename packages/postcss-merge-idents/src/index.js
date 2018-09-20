import has from 'has';
import {plugin} from 'postcss';
import valueParser from 'postcss-value-parser';
import sameParent from 'lerna:cssnano-util-same-parent';

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

function mergeAtRules (css, pairs) {
    pairs.forEach(pair => {
        pair.cache = [];
        pair.replacements = [];
        pair.decls = [];
    });

    let relevant;

    css.walk(node => {
        if (node.type === 'atrule') {
            relevant = pairs.filter(pair => pair.atrule.test(node.name.toLowerCase()))[0];
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
                        cached.name.toLowerCase() === node.name.toLowerCase() &&
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
            relevant = pairs.filter(pair => pair.decl.test(node.prop.toLowerCase()))[0];
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
            }).toString();
        });
    });
}

export default plugin('postcss-merge-idents', () => {
    return css => {
        mergeAtRules(css, [{
            atrule: /keyframes/i,
            decl: /animation/i,
        }, {
            atrule: /counter-style/i,
            decl: /(list-style|system)/i,
        }]);
    };
});

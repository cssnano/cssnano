import valueParser from "postcss-value-parser";
import addToCache from "./cache";

const RESERVED_KEYWORDS = [
    "none", "inherit", "initial", "unset",
];

let cache   = {};
let atRules = [];
let decls   = [];

export default {

    collect (node, encoder) {
        const {name, prop, type} = node;

        if (
            type === 'atrule' &&
            /keyframes/.test(name) &&
            RESERVED_KEYWORDS.indexOf(node.params) === -1
        ) {
            addToCache(node.params, encoder, cache);
            atRules.push(node);
        }

        if (type === 'decl' && /animation/.test(prop)) {
            decls.push(node);
        }
    },

    transform () {
        // Iterate each property and change their names
        decls.forEach(decl => {
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
        // Iterate each at rule and change their name if references to them have been found
        atRules.forEach(rule => {
            const cached = cache[rule.params];
            if (cached && cached.count > 0) {
                rule.params = cached.ident;
            }
        });

        // reset cache after transform
        cache   = {};
        atRules = [];
        decls   = [];
    },

};

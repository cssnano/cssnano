import valueParser from "postcss-value-parser";
import addToCache from "./cache";
import isNum from "./isNum";

const RESERVED_KEYWORDS = [
    "auto", "span", "inherit", "initial", "unset",
];

let cache     = {};
let declCache = [];

export default {

    collect (node, encoder) {
        if (node.type !== 'decl') {
            return;
        }

        if (/(grid-template|grid-template-areas)/.test(node.prop)) {
            valueParser(node.value).walk(child => {
                if (child.type === 'string') {
                    child.value.split(/\s+/).forEach(word => {
                        if (/\.+/.test(word)) { // reduce empty zones to a single `.`
                            node.value = node.value.replace(word, ".");
                        } else {
                            addToCache(word, encoder, cache);
                        }
                    });
                }
            });
            declCache.push(node);
        } else if (node.prop === 'grid-area') {
            valueParser(node.value).walk(child => {
                if (child.type === 'word' && RESERVED_KEYWORDS.indexOf(child.value) === -1) {
                    addToCache(child.value, encoder, cache);
                }
            });
            declCache.push(node);
        }
    },

    transform () {
        declCache.forEach(decl => {
            decl.value = valueParser(decl.value).walk(node => {
                if (/(grid-template|grid-template-areas)/.test(decl.prop)) {
                    node.value.split(/\s+/).forEach(word => {
                        if (word in cache) {
                            node.value = node.value.replace(word, cache[word].ident);
                        }
                    });
                    node.value = node.value.replace(/\s+/g, " "); // merge white-spaces
                }
                if (decl.prop === 'grid-area' && !isNum(node)) {
                    if (node.value in cache) {
                        node.value = cache[node.value].ident;
                    }
                }
                return false;
            }).toString();
        });

        // reset cache after transform
        cache     = {};
        declCache = [];
    },

};

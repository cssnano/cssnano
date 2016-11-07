import {plugin} from 'postcss';
import sort from 'alphanum-sort';
import has from 'has';
import parser from 'postcss-selector-parser';
import unquote from './lib/unquote';
import canUnquote from './lib/canUnquote';

const pseudoElements = ['::before', '::after', '::first-letter', '::first-line'];

function getParsed (selectors, callback) {
    return parser(callback).process(selectors).result;
}

function attribute (selector) {
    if (selector.value) {
        // Join selectors that are split over new lines
        selector.value = selector.value.replace(/\\\n/g, '').trim();
        if (canUnquote(selector.value)) {
            selector.value = unquote(selector.value);
        }
        selector.operator = selector.operator.trim();
    }
    if (selector.raws && selector.raws.insensitive) {
        selector.raws.insensitive = '';
    }
    selector.attribute = selector.attribute.trim();
}

function combinator (selector) {
    const value = selector.value.trim();
    selector.value = value.length ? value : ' ';
}

function pseudo (selector) {
    const uniques = [];
    selector.walk(child => {
        if (child.type === 'selector') {
            const childStr = String(child);
            if (!~uniques.indexOf(childStr)) {
                uniques.push(childStr);
            } else {
                child.remove();
            }
        }
    });
    if (~pseudoElements.indexOf(selector.value)) {
        selector.value = selector.value.slice(1);
    }
}

const tagReplacements = {
    from: '0%',
    '100%': 'to',
};

function tag (selector) {
    const {value} = selector;
    if (has(tagReplacements, value)) {
        selector.value = tagReplacements[value];
    }
}

function universal (selector) {
    const next = selector.next();
    if (next && next.type !== 'combinator') {
        selector.remove();
    }
}

const reducers = {
    attribute,
    combinator,
    pseudo,
    tag,
    universal,
};

function optimise (rule) {
    const selector = rule.raws.selector && rule.raws.selector.raw || rule.selector;
    // If the selector ends with a ':' it is likely a part of a custom mixin,
    // so just pass through.
    if (selector[selector.length - 1] === ':') {
        return;
    }
    rule.selector = getParsed(selector, selectors => {
        selectors.nodes = sort(selectors.nodes, {insensitive: true});
        const uniqueSelectors = [];
        selectors.walk(sel => {
            const {type} = sel;
            // Trim whitespace around the value
            sel.spaces.before = sel.spaces.after = '';
            if (has(reducers, type)) {
                reducers[type](sel);
                return;
            }
            const toString = String(sel);
            if (type === 'selector' && sel.parent.type !== 'pseudo') {
                if (!~uniqueSelectors.indexOf(toString)) {
                    uniqueSelectors.push(toString);
                } else {
                    sel.remove();
                }
            }
        });
    });
}

export default plugin('postcss-minify-selectors', () => {
    return css => css.walkRules(optimise);
});

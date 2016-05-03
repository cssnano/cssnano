import postcss from 'postcss';
import sort from 'alphanum-sort';
import unquote from './lib/unquote';
import canUnquote from './lib/canUnquote';
import parser from 'postcss-selector-parser';

const pseudoElements = ['::before', '::after', '::first-letter', '::first-line'];

function getParsed (selectors, callback) {
    return parser(callback).process(selectors).result;
}

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
            const toString = String(sel);
            // Trim whitespace around the value
            sel.spaces.before = sel.spaces.after = '';
            if (sel.type === 'attribute') {
                if (sel.value) {
                    // Join selectors that are split over new lines
                    sel.value = sel.value.replace(/\\\n/g, '').trim();
                    if (canUnquote(sel.value)) {
                        sel.value = unquote(sel.value);
                    }
                    sel.operator = sel.operator.trim();
                }
                if (sel.raw) {
                    sel.raw.insensitive = '';
                }
                sel.attribute = sel.attribute.trim();
            }
            if (sel.type === 'combinator') {
                const value = sel.value.trim();
                sel.value = value.length ? value : ' ';
            }
            if (sel.type === 'pseudo') {
                const uniques = [];
                sel.walk(child => {
                    if (child.type === 'selector') {
                        const childStr = String(child);
                        if (!~uniques.indexOf(childStr)) {
                            uniques.push(childStr);
                        } else {
                            child.remove();
                        }
                    }
                });
                if (~pseudoElements.indexOf(sel.value)) {
                    sel.value = sel.value.slice(1);
                }
            }
            if (sel.type === 'selector' && sel.parent.type !== 'pseudo') {
                if (!~uniqueSelectors.indexOf(toString)) {
                    uniqueSelectors.push(toString);
                } else {
                    sel.remove();
                }
            }
            if (sel.type === 'tag') {
                if (sel.value === 'from') { 
                    sel.value = '0%';
                } else if (sel.value === '100%') {
                    sel.value = 'to';
                }
            }
            if (sel.type === 'universal') {
                const next = sel.next();
                if (next && next.type !== 'combinator') {
                    sel.remove();
                }
            }
        });
    });
}

export default postcss.plugin('postcss-minify-selectors', () => {
    return css => css.walkRules(optimise);
});

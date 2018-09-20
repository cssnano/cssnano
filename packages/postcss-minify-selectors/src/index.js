import {plugin} from 'postcss';
import sort from 'alphanum-sort';
import has from 'has';
import parser from 'postcss-selector-parser';
import unquote from './lib/unquote';
import canUnquote from './lib/canUnquote';

const pseudoElements = ['::before', '::after', '::first-letter', '::first-line'];

function getParsed (selectors, callback) {
    return parser(callback).processSync(selectors);
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
    if (!selector.raws) {
        selector.raws = {};
    }
    if (!selector.raws.spaces) {
        selector.raws.spaces = {};
    }
    selector.raws.spaces.attribute = {
        before: '',
        after: '',
    };
    selector.raws.spaces.operator = {
        before: '',
        after: '',
    };
    selector.raws.spaces.value = {
        before: '',
        after: selector.insensitive ? ' ' : '',
    };
    if (selector.insensitive) {
        selector.raws.spaces.insensitive = {
            before: '',
            after: '',
        };
    }

    selector.attribute = selector.attribute.trim();
}

function combinator (selector) {
    const value = selector.value.trim();
    selector.value = value.length ? value : ' ';
}

const pseudoReplacements = {
    ':nth-child': ':first-child',
    ':nth-of-type': ':first-of-type',
    ':nth-last-child': ':last-child',
    ':nth-last-of-type': ':last-of-type',
};

function pseudo (selector) {
    const value = selector.value.toLowerCase();
    if (selector.nodes.length === 1 && pseudoReplacements[value]) {
        const first = selector.at(0);
        const one = first.at(0);
        if (first.length === 1) {
            if (one.value === '1') {
                selector.replaceWith(parser.pseudo({
                    value: pseudoReplacements[value],
                }));
            }
            if (one.value.toLowerCase() === 'even') {
                one.value = '2n';
            }
        }
        if (first.length === 3) {
            const two   = first.at(1);
            const three = first.at(2);
            if (
                one.value.toLowerCase() === '2n' &&
                two.value === '+' &&
                three.value === '1'
            ) {
                one.value = 'odd';
                two.remove();
                three.remove();
            }
        }

        return;
    }
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
    if (~pseudoElements.indexOf(value)) {
        selector.value = selector.value.slice(1);
    }
}

const tagReplacements = {
    from: '0%',
    '100%': 'to',
};

function tag (selector) {
    const value = selector.value.toLowerCase();
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
    const selector = (rule.raws.selector && rule.raws.selector.value === rule.selector) ?
        rule.raws.selector.raw : rule.selector;
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

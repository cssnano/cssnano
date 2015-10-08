'use strict';

import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import colormin from './lib/colormin';

function extractColorArguments(nodes) {
    let result = [];
    for (let i = 0, max = nodes.length; i < max; i += 1) {
        if (nodes[i].type === 'word') {
            let val = parseFloat(nodes[i].value);
            if (isNaN(val)) {
                return false;
            }
            result.push(val);
        }
    }

    return result;
}

function reduceColor (decl) {
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type === 'function') {
            if (/^(rgb|hsl)a?$/.test(node.value)) {
                let args = extractColorArguments(node.nodes);
                if (args) {
                    node.value = colormin(node.value, args);
                    node.type = 'word';
                }
            }
        } else if (node.type === 'word') {
            node.value = colormin(node.value);
        }
    }).toString();
}

function reduceWhitespaces (decl) {
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type === 'function' || node.type === 'div') {
            node.before = node.after = '';
        }
    }).toString();
}

function transform (decl) {
    if (decl.prop === '-webkit-tap-highlight-color') {
        if (decl.value === 'inherit' || decl.value === 'transparent') {
            return;
        }
        reduceWhitespaces(decl);
    } else if (/^(?!font|filter)/.test(decl.prop)) {
        reduceColor(decl);
    }
}

export default postcss.plugin('postcss-colormin', () => {
    return function (css) {
        css.walkDecls(transform);
    };
});

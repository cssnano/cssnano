import {plugin} from 'postcss';
import valueParser from 'postcss-value-parser';

const atrule = 'atrule';
const decl = 'decl';
const rule = 'rule';

function reduceCalcWhitespaces (node) {
    if (node.type === 'space') {
        node.value = ' ';
    } else if (node.type === 'function') {
        node.before = node.after = '';
    }
}

function reduceWhitespaces (node) {
    if (node.type === 'space') {
        node.value = ' ';
    } else if (node.type === 'div') {
        node.before = node.after = '';
    } else if (node.type === 'function') {
        node.before = node.after = '';
        if (node.value.toLowerCase() === 'calc') {
            valueParser.walk(node.nodes, reduceCalcWhitespaces);
            return false;
        }
    }
}

function minimiseWhitespace (node) {
    const {type} = node;
    if (~[decl, rule, atrule].indexOf(type) && node.raws.before) {
        node.raws.before = node.raws.before.replace(/\s/g, '');
    }
    if (type === decl) {
        // Ensure that !important values do not have any excess whitespace
        if (node.important) {
            node.raws.important = '!important';
        }
        // Remove whitespaces around ie 9 hack
        node.value = node.value.replace(/\s*(\\9)\s*/, '$1');
        // Trim whitespace inside functions & dividers
        node.value = valueParser(node.value).walk(reduceWhitespaces).toString();
        // Remove extra semicolons and whitespace before the declaration
        if (node.raws.before) {
            const prev = node.prev();
            if (prev && prev.type !== rule) {
                node.raws.before = node.raws.before.replace(/;/g, '');
            }
        }
        node.raws.between = ':';
        node.raws.semicolon = false;
    } else if (type === rule || type === atrule) {
        node.raws.between = node.raws.after = '';
        node.raws.semicolon = false;
    }
}

export default plugin('postcss-normalize-whitespace', () => {
    return css => {
        css.walk(minimiseWhitespace);
        // Remove final newline
        css.raws.after = '';
    };
});

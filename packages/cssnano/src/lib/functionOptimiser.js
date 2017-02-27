import {plugin} from 'postcss';
import valueParser from 'postcss-value-parser';

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
        if (node.value === 'calc') {
            valueParser.walk(node.nodes, reduceCalcWhitespaces);
            return false;
        }
    }
}

function transformDecls (decl) {
    decl.value = valueParser(decl.value).walk(reduceWhitespaces).toString();
}

export default plugin('cssnano-function-optimiser', () => {
    return css => css.walkDecls(transformDecls);
});

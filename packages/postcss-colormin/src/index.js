import postcss from 'postcss';
import valueParser, {stringify} from 'postcss-value-parser';
import colormin from 'colormin';

function reduceWhitespaces (decl) {
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type === 'function' || node.type === 'div') {
            node.before = node.after = '';
        }
    }).toString();
}

function walk (parent, callback) {
    parent.nodes.forEach((node, index) => {
        const bubble = callback(node, index, parent);
        if (node.nodes && bubble !== false) {
            walk(node, callback);
        }
    });
}

function transform (decl, opts) {
    if (decl.prop === '-webkit-tap-highlight-color') {
        if (decl.value === 'inherit' || decl.value === 'transparent') {
            return;
        }
        reduceWhitespaces(decl);
        return;
    }
    if (/^(font|filter)/.test(decl.prop)) {
        return;
    }
    const ast = valueParser(decl.value);
    walk(ast, (node, index, parent) => {
        if (node.type === 'function') {
            if (/^(rgb|hsl)a?$/.test(node.value)) {
                const {value} = node;
                node.value = colormin(stringify(node), opts);
                node.type = 'word';
                const next = parent.nodes[index + 1];
                if (node.value !== value && next && next.type === 'word') {
                    parent.nodes.splice(index + 1, 0, {type: 'space', value: ' '});
                }
            } else if (node.value === 'calc') {
                return false;
            }
        } else {
            node.value = colormin(node.value, opts);
        }
    });
    decl.value = ast.toString();
}

export default postcss.plugin('postcss-colormin', (opts = {}) => {
    return css => css.walkDecls(node => transform(node, opts));
});

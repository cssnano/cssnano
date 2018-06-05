import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import minifyWeight from './lib/minify-weight';
import minifyFamily from './lib/minify-family';
import minifyFont from './lib/minify-font';

function transform (opts, decl) {
    let tree;
    let prop = decl.prop.toLowerCase();

    if (prop === 'font-weight') {
        decl.value = minifyWeight(decl.value);
    } else if (prop === 'font-family') {
        tree = valueParser(decl.value);
        tree.nodes = minifyFamily(tree.nodes, opts);
        decl.value = tree.toString();
    } else if (prop === 'font') {
        tree = valueParser(decl.value);
        tree.nodes = minifyFont(tree.nodes, opts);
        decl.value = tree.toString();
    }
}

export default postcss.plugin('postcss-minify-font-values', (opts) => {
    opts = Object.assign({}, {
        removeAfterKeyword: false,
        removeDuplicates: true,
        removeQuotes: true,
    }, opts);

    return css => css.walkDecls(/font/i, transform.bind(null, opts));
});

import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import minifyWeight from './lib/minify-weight';
import minifyFamily from './lib/minify-family';
import minifyFont from './lib/minify-font';

function transform (opts) {
    opts = Object.assign({}, {
        removeAfterKeyword: true,
        removeDuplicates: true,
        removeQuotes: true,
    }, opts);

    return function (decl) {
        let tree;
        let prop = decl.prop.toLowerCase();

        if (prop === 'font-weight') {
            decl.value = minifyWeight(decl.value, opts);
        } else if (prop === 'font-family') {
            tree = valueParser(decl.value);
            tree.nodes = minifyFamily(tree.nodes, opts);
            decl.value = tree.toString();
        } else if (prop === 'font') {
            tree = valueParser(decl.value);
            tree.nodes = minifyFont(tree.nodes, opts);
            decl.value = tree.toString();
        }
    };
}

export default postcss.plugin('postcss-minify-font-values', (opts) => {
    return css => {
        css.walkDecls(/font/i, transform(opts));
    };
});

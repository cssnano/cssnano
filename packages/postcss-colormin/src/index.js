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

function transform (decl) {
    if (decl.prop === '-webkit-tap-highlight-color') {
        if (decl.value === 'inherit' || decl.value === 'transparent') {
            return;
        }
        return reduceWhitespaces(decl);
    }
    if (/^(font|filter)/.test(decl.prop)) {
        return;
    }
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type === 'function') {
            if (/^(rgb|hsl)a?$/.test(node.value)) {
                node.value = colormin(stringify(node));
                node.type = 'word';
            } else if (node.value === 'calc') {
                return false;
            }
        } else {
            node.value = colormin(node.value);
        }
    }).toString();
}

export default postcss.plugin('postcss-colormin', () => {
    return css => css.walkDecls(transform);
});

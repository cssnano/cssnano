import {plugin} from 'postcss';
import valueParser from 'postcss-value-parser';

function filterOptimiser (decl) {
    decl.value = valueParser(decl.value).walk(node => {
        if (node.type === 'function' || node.type === 'div' && node.value === ',') {
            node.before = node.after = '';
        }
    }).toString();
}

export default plugin('cssnano-filter-optimiser', () => {
    return css => css.walkDecls(/filter/, filterOptimiser);
});

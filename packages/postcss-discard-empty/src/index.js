import {plugin} from 'postcss';

function discardEmpty (node) {
    const type = node.type;
    const sub = node.nodes;
    
    if (sub) {
        node.each(discardEmpty);
    }

    if (
        (type === 'decl' && !node.value) ||
        (type === 'rule' && !node.selector || sub && !sub.length) ||
        (type === 'atrule' && (!sub && !node.params || !node.params && !sub.length))
    ) {
        node.remove();
    }
}

export default plugin('postcss-discard-empty', () => {
    return css => css.each(discardEmpty);
});

import {plugin} from 'postcss';

function discardAndReport (css, result) {
    function discardEmpty (node) {
        const {type, nodes: sub} = node;

        if (sub) {
            node.each(discardEmpty);
        }

        if (
            (type === 'decl' && !node.value) ||
            (type === 'rule' && !node.selector || sub && !sub.length) ||
            (type === 'atrule' && (!sub && !node.params || !node.params && !sub.length))
        ) {
            node.remove();

            result.messages.push({
                type: 'removal',
                plugin: 'postcss-discard-empty',
                node
            });
        }
    }

    css.each(discardEmpty);
}

export default plugin('postcss-discard-empty', () => {
    return (css, result) => discardAndReport(css, result);
});

import {plugin} from 'postcss';

function dedupe (root) {
    root.each(node => {
        if (node.nodes) {
            dedupe(node);
        }
    });

    if (root.nodes.length < 2) {
        return;
    }

    let toRemove = [];
    let map = {};

    root.each(node => {
        if (node.type === "comment") {
            return;
        }

        const str = node.toString();
        const existing = map[str];
        if (existing) {
            toRemove.push(existing);
        }
        map[str] = node;
    });

    while (toRemove.length > 0) {
        toRemove.pop().remove();
    }
}

export default plugin('postcss-discard-duplicates', () => dedupe);

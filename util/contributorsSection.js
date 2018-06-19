import heading from 'mdast-util-heading-range';
import u from 'unist-builder';

const url = `https://github.com/cssnano/cssnano/blob/master/CONTRIBUTORS.md`;

export default function attacher () {
    return function transformer (tree) {
        heading(tree, /^contributors/i, (start, nodes, end) => {
            return [
                start,
                u('paragraph', [
                    u('text', `See `),
                    u('link', {url}, [u('text', 'CONTRIBUTORS.md')]),
                    u('text', `.`),
                ]),
                end,
            ];
        });
    };
};

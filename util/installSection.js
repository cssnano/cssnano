import path from 'path';
import heading from 'mdast-util-heading-range';
import u from 'unist-builder';

export default function attacher () {
    return function transformer (tree, file) {
        const {cwd} = file;
        let pkgJson;

        try {
            pkgJson = require(path.resolve(cwd, `package.json`));
        } catch (err) {
            throw new Error(`Missing "package.json" in "${cwd}".`);
        }

        const {name} = pkgJson;
        const installPage = `https://npmjs.com/package/${name}`;

        heading(tree, /^install/i, (start, nodes, end) => {
            return [
                start,
                u('paragraph', [
                    u('text', `With `),
                    u('link', {url: installPage}, [u('text', 'npm')]),
                    u('text', ` do:`),
                ]),
                u('code', `npm install ${name} --save-dev`),
                u('paragraph', [
                    u('text', `If you don't have npm then `),
                    u('link', {url: `${installPage}/tutorial`}, [
                        u('text', 'check out this installation tutorial'),
                    ]),
                    u('text', `.`),
                ]),
                end,
            ];
        });
    };
};

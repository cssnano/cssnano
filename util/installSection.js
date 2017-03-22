import path from 'path';
import camelcase from 'camelcase';
import heading from 'mdast-util-heading-range';
import u from 'unist-builder';

function getSugar (name) {
    return name.replace('cssnano-preset-', '');
}

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
        const sugar = getSugar(name);
        const installPage = `https://npmjs.com/package/${name}`;
        const presetIdentifier = `${camelcase(sugar)}Preset`;

        heading(tree, /^usage/i, (start, nodes, end) => {
            const section = [
                start,
                u('heading', {depth: 3}, [u('text', 'Install')]),
            ];
            if (sugar === 'default') {
                section.push(
                    u('paragraph', [
                        u('text', `Note that this preset comes bundled with cssnano `),
                        u('emphasis', [u('text', `by default`)]),
                        u('text', `, so you don't need to install it separately.`),
                    ]),
                    u('heading', {depth: 3}, [u('text', 'Configuration')]),
                    u('paragraph', [
                        u('text', `If you would like to use the default configuration, then you don't need to add anything to your `),
                        u('inlineCode', 'package.json'),
                        u('text', `.`),
                    ]),
                );
            } else {
                section.push(
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
                    u('heading', {depth: 3}, [u('text', 'Configuration')]),
                    u('paragraph', [
                        u('text', `If you would like to use the preset in its default configuration, specify a section in your `),
                        u('inlineCode', 'package.json'),
                        u('text', `:`),
                    ]),
                    u('code', {lang: 'diff'}, ` {\n   "name": "awesome-application",\n+  "cssnano": {\n+    "preset": "${sugar}"\n+  }\n }`),
                );
            }
            return [
                ...section,
                u('paragraph', [
                    u('text', `But should you wish to customise this, you can pass an array with the second parameter as the options object to use. For example, to remove all comments:`),
                ]),
                u('code', {lang: 'diff'}, ` {\n   "name": "awesome-application",\n+  "cssnano": {\n+    "preset": [\n+      "${sugar}",\n+      {"discardComments": {"removeAll": true}}\n+    ]\n+  }\n }`),
                u('paragraph', [
                    u('text', `Depending on your usage, the JSON configuration might not work for you, such as in cases where you would like to use options with customisable function parameters. For this use case, we recommend a `),
                    u('inlineCode', `cssnano.config.js`),
                    u('text', ` at the same location as your `),
                    u('inlineCode', 'package.json'),
                    u('text', `. You can then load a preset and export it with your custom parameters:`),
                ]),
                u('code', {lang: 'js'}, `const ${presetIdentifier} = require('${name}');\n\nmodule.exports = ${presetIdentifier}({\n  discardComments: {\n    remove: comment => comment[0] === "@"\n  }\n});`),
                u('paragraph', [
                    u('text', `Note that you may wish to publish your own preset to npm for reusability, should it differ a lot from this one. This is highly encouraged!`),
                ]),
                end,
            ];
        });
    };
};

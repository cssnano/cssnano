import {readFileSync} from 'fs';
import {basename, join} from 'path';
import remove from 'unist-util-remove';
import u from 'unist-builder';
import heading from 'mdast-util-heading-range';
import remark from 'remark';
import remarkBehead from 'remark-behead';
import remarkGithub from 'remark-github';
import writeFile from 'write-file';
import toml from 'toml';
import getPackages from '../../util/getPackages';
import getPresets from '../../util/getPresets';
import pluginName from '../../util/pluginName';

function frontMatter (opts) {
    return Object.keys(opts).reduce((header, key) => {
        return `${header}${key}: ${opts[key]}\n`;
    }, `---\n`) + `---\n\n<!-- This file was automatically generated. -->\n\n\n`;
}

function removeFirstHeading () {
    return tree => {
        // Remove the first heading so as to not duplicate
        // the automatically generated one.
        return remove(tree, (node, index) => {
            return (!index && node.type === 'heading');
        });
    }
}

function getMetadata () {
    return toml.parse(
        readFileSync(join(__dirname, '../../metadata.toml'), 'utf8')
    );
}

function generateChangelog () {
    const cssnanoChangelog = readFileSync(
        join(__dirname, '../../packages/cssnano/CHANGELOG.md')
    );

    const transformed = remark()
        .use(remarkBehead, {depth: 1})
        .use(remarkGithub, {repository: 'ben-eb/cssnano'})
        .processSync(cssnanoChangelog).contents;

    return writeFile(
        join(__dirname, '../content/changelog.md'),
        `${frontMatter({title: 'Changelog', layout: 'Page'})}${transformed}`
    );
}

function generateContributing () {
    const contributing = readFileSync(
        join(__dirname, '../../CONTRIBUTING.md')
    );

    const transformed = remark()
        .use(removeFirstHeading)
        .processSync(contributing).contents;

    return writeFile(
        join(__dirname, '../content/guides/contributing.md'),
        `${frontMatter({title: 'Contributing', layout: 'Guide', order: 6})}${transformed}`
    );
}

function getPlugins (presets) {
    return presets.reduce((data, path) => {
        const {usage, presets} = data;
        const preset = basename(path);
        const short = preset.replace('cssnano-preset-', '');
        presets.push(short);
        const instance = require(path)();
        instance.plugins.forEach((entry) => {
            const name = pluginName(entry[0]);
            if (!usage[name]) {
                usage[name] = [];
            }
            usage[name].push(short);
            usage[name] = defaultFirst(usage[name]);
        });
        return {usage, presets};
    }, {usage: {}, presets: []});
}

function defaultFirst (presets) {
    const index = presets.indexOf('default');
    if (index > 0) {
        presets.splice(index, 1);
        presets.unshift('default');
    }
    return presets;
}

function optimisationsTable (presets, plugins) {
    const metadata = getMetadata();
    const rows = [];
    rows.push(
        u('tableRow', [
            u('tableCell', []),
            ...defaultFirst(plugins.presets).map(preset => {
                return u('tableCell', [u('text', preset)]);
            }),
        ])
    );
    const headers = Object.keys(plugins.usage).sort();
    headers.forEach(header => {
        const data = plugins.usage[header];
        rows.push(
            u('tableRow', [
                u('tableCell', [u('link', {url: `/optimisations/${metadata[header].shortName.toLowerCase()}`}, [
                    u('text', header)
                ])]),
                ...plugins.presets.map(preset => {
                    if (~data.indexOf(preset)) {
                        return u('tableCell', [u('text', '✅')]);
                    } else {
                        return u('tableCell', [u('text', '❌')]);
                    }
                })
            ])
        )
    });

    return u('table', {align: []}, rows);
}

function updateOptimisationGuide () {
    const optimisations = readFileSync(
        join(__dirname, '../content/guides/optimisations.md')
    );

    return getPackages().then(packages => {
        const presets = getPresets(packages);
        const plugins = getPlugins(presets);

        const transformed = remark()
            .use(() => tree => {
                heading(tree, /^What optimisations do you support\?/i, (start, nodes, end) => {
                    return [
                        start,
                        u('html', '<!-- This section is automatically generated. -->'),
                        u('paragraph', [
                            u('text', `The optimisations are different depending on which preset cssnano is configured with; with the default preset, we offer safe transforms only.`),
                        ]),
                        optimisationsTable(presets, plugins),
                        u('paragraph', [
                            u('text', 'You can read more about presets in our '),
                            u('link', {url: '/guides/presets/'}, [u('text', 'presets guide')]),
                            u('text', '.'),
                        ]),
                        end,
                    ];
                });
            })
            .processSync(optimisations).contents;
        return writeFile(
            join(__dirname, '../content/guides/optimisations.md'),
            transformed
        );
    });
}

function updateOptimisationsIndex () {
    return getPackages().then(packages => {
        const presets = getPresets(packages);
        const plugins = getPlugins(presets);

        const transformed = remark().stringify(optimisationsTable(presets, plugins));

        return writeFile(
            join(__dirname, '../content/optimisations.md'),
            `${frontMatter({title: "Optimisations", layout: "Page"})}${transformed}`
        );
    })
}

function updateCommunity () {
    const contributors = readFileSync(
        join(__dirname, '../../CONTRIBUTORS.md')
    );

    const transformed = remark()
        .use(removeFirstHeading)
        .processSync(contributors).contents;

    const community = readFileSync(
        join(__dirname, '../content/community.md')
    );

    const updated = remark()
        .use(() => tree => {
            heading(tree, /Contributors/, (start, nodes, end) => {
                return [
                    start,
                    u('html', '<!-- This section was automatically generated. -->'),
                    ...remark.parse(transformed).children,
                    end,
                ];
            })
        })
        .processSync(community).contents;

    return writeFile(
        join(__dirname, '../content/community.md'),
        updated
    );
}

function updateOptimisations () {
    const metadata = getMetadata();

    return Promise.all(Object.keys(metadata).map(m => {
        const {shortName, longDescription} = metadata[m];
        const identifier = shortName.toLowerCase();
        const fm = frontMatter({
            title: `"${shortName}"`,
            layout: "Optimisation",
            identifier,
        });
        const content = `${fm}${longDescription}`;

        return writeFile(
            join(__dirname, `../content/optimisations/${identifier}.md`),
            content
        );
    }));
}

Promise.all([
    generateChangelog(),
    generateContributing(),
    updateOptimisationGuide(),
    updateOptimisations(),
    updateOptimisationsIndex(),
    updateCommunity(),
]);

import {basename, join} from 'path';
import fs from 'fs-extra';
import remove from 'unist-util-remove';
import u from 'unist-builder';
import heading from 'mdast-util-heading-range';
import remark from 'remark';
import remarkBehead from 'remark-behead';
import remarkGithub from 'remark-github';
import toml from 'toml';
import remarkPreset from "../.remarkrc";
import getPackages from './getPackages';
import getPresets from './getPresets';
import pluginName from './pluginName';

const cssnanoChangelogPath =  join(__dirname, '../packages/cssnano/CHANGELOG.md');
const contributingPath = join(__dirname, '../CONTRIBUTING.md');
const contributorsPath = join(__dirname, '../CONTRIBUTORS.md');

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
    };
}

function getMetadata () {
    return toml.parse(fs.readFileSync(join(__dirname, '../metadata.toml')));
}

function getPlugins (presets) {
    return presets.reduce((data, path) => {
        // eslint-disable-next-line no-shadow
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
                    u('text', header),
                ])]),
                ...plugins.presets.map(preset => {
                    if (~data.indexOf(preset)) {
                        return u('tableCell', [u('text', '✅')]);
                    } else {
                        return u('tableCell', [u('text', '❌')]);
                    }
                }),
            ])
        );
    });

    return u('table', {align: []}, rows);
}

function generateChangelog () {
    return Promise.resolve()
        .then(() => fs.readFile(cssnanoChangelogPath))
        .then((changlog) => {
            return new Promise((resolve) => remark()
                .use(remarkPreset)
                .use(remarkBehead, {depth: 1})
                .use(remarkGithub, {repository: 'cssnano/cssnano'})
                .process(String(changlog), (error, file) => {
                    if (error) {
                        throw error;
                    }

                    return resolve(String(file));
                })
            );
        })
        .then(
            (transformedChangelog) =>
                fs.writeFile(
                    join(__dirname, '../site/content/changelog.md'),
                    `${frontMatter({title: 'Changelog', layout: 'Page'})}${transformedChangelog}`
                )
        );
}

function generateContributing () {
    return Promise.resolve()
        .then(() => fs.readFile(contributingPath))
        .then((contributing) => {
            return new Promise((resolve) => remark()
                .use(remarkPreset)
                .use(removeFirstHeading)
                .process(String(contributing), (error, file) => {
                    if (error) {
                        throw error;
                    }

                    return resolve(String(file));
                })
            );
        })
        .then(
            (transformedContributing) =>
                fs.writeFile(
                    join(__dirname, '../site/content/guides/contributing.md'),
                    `${frontMatter({title: 'Contributing', layout: 'Guide', order: 6})}${transformedContributing}`
                )
        );
}

function updateOptimisationGuide () {
    return Promise.resolve()
        .then(() => fs.readFile(join(__dirname, '../site/content/guides/optimisations.md')))
        .then((optimisations) => {
            return getPackages().then((packages) => {
                const presets = getPresets(packages);
                const plugins = getPlugins(presets);

                return new Promise((resolve) => remark()
                    .use(remarkPreset)
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
                    .process(String(optimisations), (error, file) => {
                        if (error) {
                            throw error;
                        }

                        return resolve(String(file));
                    })
                );
            });
        })
        .then(
            (transformedOptimisations) =>
            fs.writeFile(
                join(__dirname, '../site/content/guides/optimisations.md'),
                transformedOptimisations
            )
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

        return fs.outputFile(
            join(__dirname, `../site/content/optimisations/${identifier}.md`),
            content
        );
    }));
}

function updateOptimisationsIndex () {
    return Promise.resolve()
        .then(() => getPackages())
        .then((packages) => {
            const presets = getPresets(packages);
            const plugins = getPlugins(presets);

            return remark().use(remarkPreset).stringify(optimisationsTable(presets, plugins));
        })
        .then(
            (optimisationsTransformed) =>
                fs.writeFile(
                    join(__dirname, '../site/content/optimisations.md'),
                    `${frontMatter({title: "Optimisations", layout: "Page"})}${optimisationsTransformed}`
                )
        );
}

function updateCommunity () {
    return Promise.resolve()
        .then(() => fs.readFile(contributorsPath))
        .then((contributors) => new Promise((resolve) => {
            return remark()
                .use(remarkPreset)
                .use(removeFirstHeading)
                .process(contributors.toString(), (error, file) => {
                    if (error) {
                        throw error;
                    }

                    return resolve(String(file));
                });
        }))
        .then((transformedContributors) => {
            return Promise.resolve()
                .then(() => fs.readFile(join(__dirname, '../site/content/community.md')))
                .then((community) => new Promise(resolve => {
                    return remark()
                        .use(remarkPreset)
                        .use(() => tree => {
                            heading(tree, /Contributors/, (start, nodes, end) => {
                                const {children} = remark().use(remarkPreset).parse(transformedContributors);

                                return [
                                    start,
                                    u('html', '<!-- This section was automatically generated. -->'),
                                    ...children,
                                    end,
                                ];
                            });
                        })
                        .process(String(community), (error, file) => {
                            if (error) {
                                throw error;
                            }

                            return resolve(String(file));
                        });
                }));
        })
        .then(
            (transformedCommunity) =>
                fs.writeFile(
                    join(__dirname, '../site/content/community.md'),
                    transformedCommunity
                )
        );
}

Promise.all([
    generateChangelog(),
    generateContributing(),
    updateOptimisationGuide(),
    updateOptimisations(),
    updateOptimisationsIndex(),
    updateCommunity(),
]);

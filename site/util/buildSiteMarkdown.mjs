import { basename, join, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { readFileSync } from 'fs';
import { remove } from 'unist-util-remove';
import { u } from 'unist-builder';
import { headingRange } from 'mdast-util-heading-range';
import { remark } from 'remark';
import remarkBehead from 'remark-behead';
import remarkGithub from 'remark-github';
import toml from 'toml';
import remarkPreset from '../.remarkrc.mjs';
import getPackages from './getPackages.mjs';
import getPresets from './getPresets.mjs';
import pluginName from './pluginName.mjs';

const cssnanoChangelogPath = new URL(
  '../../packages/cssnano/CHANGELOG.md',
  import.meta.url
);
const contributingPath = new URL('../../CONTRIBUTING.md', import.meta.url);
const contributorsPath = new URL('../../CONTRIBUTORS.md', import.meta.url);

const require = createRequire(import.meta.url);

function frontMatter(opts) {
  return (
    Object.keys(opts).reduce((header, key) => {
      return `${header}${key}: ${opts[key]}\n`;
    }, `---\n`) + `---\n\n<!-- This file was automatically generated. -->\n\n\n`
  );
}

function removeFirstHeading() {
  return (tree) => {
    // Remove the first heading so as to not duplicate
    // the automatically generated one.
    return remove(tree, (node, index) => {
      return !index && node.type === 'heading';
    });
  };
}

function getMetadata() {
  return toml.parse(
    readFileSync(new URL('../../metadata.toml', import.meta.url))
  );
}

function getPlugins(presets) {
  const data = { usage: {}, presets: [] };
  for (const path of presets) {
    const preset = basename(path);
    const short = preset.replace('cssnano-preset-', '');
    data.presets.push(short);
    const instance = require(path + '/src/index.js');

    instance().plugins.forEach((entry) => {
      const name = pluginName(entry[0]);
      if (!data.usage[name]) {
        data.usage[name] = [];
      }
      data.usage[name].push(short);
      data.usage[name] = defaultFirst(data.usage[name]);
    });
  }
  return data;
}

function isDisabled(preset, name) {
  const full = `${join(
    dirname(fileURLToPath(import.meta.url)),
    '../../packages'
  )}/cssnano-preset-${preset}/src/index.js`;
  const instance = require(full);
  const plugin = instance().plugins.find((entry) => {
    const n = pluginName(entry[0]);
    return n === name;
  });
  return plugin && plugin[1] ? plugin[1].exclude : false;
}

function defaultFirst(presets) {
  const index = presets.indexOf('default');
  if (index > 0) {
    presets.splice(index, 1);
    presets.unshift('default');
  }
  return presets;
}

function optimisationsTable(presets, plugins) {
  const metadata = getMetadata();
  const rows = [];
  rows.push(
    u('tableRow', [
      u('tableCell', []),
      ...defaultFirst(plugins.presets).map((preset) => {
        return u('tableCell', [u('text', preset)]);
      }),
    ])
  );
  const headers = Object.keys(plugins.usage).sort();
  headers.forEach((header) => {
    if (metadata[header]) {
      const data = plugins.usage[header];
      rows.push(
        u('tableRow', [
          u('tableCell', [
            u(
              'link',
              {
                url: `/docs/optimisations/${metadata[
                  header
                ].shortName.toLowerCase()}`,
              },
              [u('text', metadata[header].shortName)]
            ),
          ]),
          ...plugins.presets.map((preset) => {
            if (~data.indexOf(preset)) {
              if (isDisabled(preset, header)) {
                return u('tableCell', [u('text', 'disabled')]);
              }
              return u('tableCell', [u('text', '✅')]);
            } else {
              return u('tableCell', [u('text', '❌')]);
            }
          }),
        ])
      );
    }
  });
  return u('table', { align: [] }, rows);
}

function generateChangelog() {
  return Promise.resolve()
    .then(() => fs.readFile(cssnanoChangelogPath))
    .then((changlog) => {
      return new Promise((resolve) =>
        remark()
          .use(remarkPreset)
          .use(remarkBehead, { depth: 1 })
          .use(remarkGithub, { repository: 'cssnano/cssnano' })
          .process(String(changlog), (error, file) => {
            if (error) {
              throw error;
            }

            return resolve(String(file));
          })
      );
    })
    .then((transformedChangelog) =>
      fs.writeFile(
        new URL('../docs/changelog.md', import.meta.url),
        `${frontMatter({
          title: 'Changelog',
          layout: 'Page',
        })}${transformedChangelog}`
      )
    );
}

function generateContributing() {
  return Promise.resolve()
    .then(() => fs.readFile(contributingPath))
    .then((contributing) => {
      return new Promise((resolve) =>
        remark()
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
    .then((transformedContributing) =>
      fs.writeFile(
        new URL('../docs/contributing.md', import.meta.url),
        `${frontMatter({
          title: 'Contributing',
          layout: 'Guide',
          order: 6,
        })}${transformedContributing}`
      )
    );
}

function updateOptimisationGuide() {
  return Promise.resolve()
    .then(() =>
      fs.readFile(
        new URL('../docs/what_are_optimisations.mdx', import.meta.url)
      )
    )
    .then((optimisations) => {
      return getPackages().then((packages) => {
        const presets = getPresets(packages);
        const plugins = getPlugins(presets);

        return new Promise((resolve) =>
          remark()
            .use(remarkPreset)
            .use(() => (tree) => {
              headingRange(
                tree,
                /^What optimisations do you support\?/i,
                (start, nodes, end) => {
                  return [
                    start,
                    u(
                      'html',
                      '<!-- This section is automatically generated. -->'
                    ),
                    u('paragraph', [
                      u(
                        'text',
                        `The optimisations are different depending on which preset cssnano is configured with; with the default preset, we offer safe transforms only.`
                      ),
                    ]),
                    optimisationsTable(presets, plugins),
                    u('paragraph', [
                      u('text', 'You can read more about presets in our '),
                      u('link', { url: '/docs/presets' }, [
                        u('text', 'presets guide'),
                      ]),
                      u('text', '.'),
                    ]),
                    end,
                  ];
                }
              );
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
    .then((transformedOptimisations) =>
      fs.writeFile(
        new URL('../docs/what_are_optimisations.mdx', import.meta.url),
        transformedOptimisations
      )
    );
}

function updateOptimisations() {
  const metadata = getMetadata();

  return Promise.all(
    Object.keys(metadata).map((m) => {
      const { shortName, longDescription } = metadata[m];
      const identifier = shortName.toLowerCase();
      const fm = frontMatter({
        title: `"${shortName}"`,
        layout: 'Optimisation',
        identifier,
      });
      const content = `${fm}${longDescription}`;

      return fs.writeFile(
        new URL(`../docs/optimisations/${identifier}.md`, import.meta.url),
        content
      );
    })
  );
}

function updateOptimisationsIndex() {
  return Promise.resolve()
    .then(() => getPackages())
    .then((packages) => {
      const presets = getPresets(packages);
      const plugins = getPlugins(presets);

      return remark()
        .use(remarkPreset)
        .stringify(optimisationsTable(presets, plugins));
    })
    .then((optimisationsTransformed) =>
      fs.writeFile(
        new URL('../docs/optimisations.md', import.meta.url),
        `${frontMatter({
          title: 'Optimisations',
          layout: 'Page',
        })}${optimisationsTransformed}`
      )
    );
}

function updateCommunity() {
  return Promise.resolve()
    .then(() => fs.readFile(contributorsPath))
    .then(
      (contributors) =>
        new Promise((resolve) => {
          return remark()
            .use(remarkPreset)
            .use(removeFirstHeading)
            .process(contributors.toString(), (error, file) => {
              if (error) {
                throw error;
              }

              return resolve(String(file));
            });
        })
    )
    .then((transformedContributors) => {
      return Promise.resolve()
        .then(() =>
          fs.readFile(new URL('../docs/community.md', import.meta.url))
        )
        .then(
          (community) =>
            new Promise((resolve) => {
              return remark()
                .use(remarkPreset)
                .use(() => (tree) => {
                  headingRange(tree, /Contributors/, (start, nodes, end) => {
                    const { children } = remark()
                      .use(remarkPreset)
                      .parse(transformedContributors);

                    return [
                      start,
                      u(
                        'html',
                        '<!-- This section was automatically generated. -->'
                      ),
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
            })
        );
    })
    .then((transformedCommunity) =>
      fs.writeFile(
        new URL('../docs/community.md', import.meta.url),
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

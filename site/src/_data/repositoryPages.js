/**
 * Pages built from repository Markdown files. The key is the content entry ID,
 * which also sets the page path, such as `docs/community/`.
 * `file` is relative to the repository root; `title` names the page and its sidebar link.
 * `description` summarises the page for search results and link previews.
 */
export const repositoryPages = {
  community: {
    file: 'CONTRIBUTORS.md',
    title: 'Contributors',
    description:
      'The people who have contributed code, documentation and support to cssnano.',
  },
  contributing: {
    file: 'CONTRIBUTING.md',
    title: 'Contributing',
    description:
      'How to set up the cssnano repository and contribute code, tests and documentation.',
  },
  changelog: {
    file: 'packages/cssnano/CHANGELOG.md',
    title: 'Changelog',
    description: 'Release notes for each version of cssnano.',
  },
};

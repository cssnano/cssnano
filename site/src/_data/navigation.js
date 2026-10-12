import { repositoryPages } from './repositoryPages.js';

const base = import.meta.env.BASE_URL;

/** @param {string} path site path without the base, such as `docs/introduction/` */
export const page = (path) => `${base}${path}`;

export const externalLinks = {
  github: {
    label: 'GitHub',
    href: 'https://github.com/cssnano/cssnano',
    external: true,
  },
  donate: {
    label: 'Donate',
    href: 'https://opencollective.com/cssnano',
    external: true,
  },
  stackOverflow: {
    label: 'Stack Overflow',
    href: 'https://stackoverflow.com/questions/tagged/cssnano',
    external: true,
  },
};

const blogLink = { label: 'Blog', href: page('blog/'), match: [page('blog/')] };

/** Top bar. `match` lists the path prefixes that mark a link as current. */
export const headerLinks = [
  { label: 'Guide', href: page('docs/introduction/'), match: [page('docs/')] },
  {
    label: 'Optimisations',
    href: page('docs/what-are-optimisations/'),
    match: [page('docs/what-are-optimisations/'), page('docs/optimisations/')],
  },
  {
    label: 'Playground',
    href: page('playground/'),
    match: [page('playground/')],
  },
  {
    label: 'Support',
    href: page('docs/support-us/'),
    match: [page('docs/support-us/')],
  },
  blogLink,
];

/** Top bar links that leave the site. */
export const headerExternalLinks = [externalLinks.github, externalLinks.donate];

/** Footer columns. Internal links reuse the header entries. */
export const footerColumns = [
  {
    heading: 'Docs',
    links: headerLinks.filter((link) => link !== blogLink),
  },
  {
    heading: 'Community',
    links: [externalLinks.stackOverflow, externalLinks.donate],
  },
  {
    heading: 'Social',
    links: [blogLink, externalLinks.github],
  },
];

/** @param {string} slug docs page slug, such as `introduction` @param {string} label */
const doc = (slug, label) => ({ label, href: page(`docs/${slug}/`) });

/** @param {keyof typeof repositoryPages} id repository page ID, which sets the path */
const repositoryLink = (id) => ({
  label: repositoryPages[id].title,
  href: page(`docs/${id}/`),
});

/** Documentation sidebar, grouped under headings. */
export const sidebarSections = [
  {
    heading: 'Getting Started',
    links: [
      doc('introduction', 'Introduction'),
      doc('getting-started', 'Getting Started'),
      doc('config-file', 'Configuration'),
      doc('what-are-optimisations', 'Optimisations'),
      doc('presets', 'Presets'),
      doc('advanced-transforms', 'Advanced Transforms'),
    ],
  },
  {
    heading: 'Developer Guide',
    links: [repositoryLink('contributing'), repositoryLink('changelog')],
  },
  {
    heading: 'Project',
    links: [repositoryLink('community'), doc('support-us', 'Support')],
  },
];

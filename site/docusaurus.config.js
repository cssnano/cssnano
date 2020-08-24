module.exports = {
  title: 'CSSNANO',
  tagline: `Deliver your website's styles, faster.`,
  url: 'https://cssnano.github.io', // url to your site with no trailing slash
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'cssnano', // Usually your GitHub org/user name.
  projectName: 'cssnano', // Usually your repo name.
  themeConfig: {
    navbar: {
      hideOnScroll: false,
      logo: {
        alt: 'CSSNANO Logo',
        src: 'img/logo-alt.svg',
      },
      links: [
        {
          to: 'docs/introduction',
          label: 'Guide',
          position: 'left',
        },
        {
          to: 'docs/optimisations',
          label: 'Optimizations',
          position: 'left',
          activeBasePath: 'optimisations',
        },
        { to: 'playground', label: 'Playground', position: 'left' },
        { to: 'docs/support_us', label: 'Support', position: 'left' },
        { to: 'blog', label: 'Blog', position: 'right' },
        {
          href: 'https://github.com/cssnano/cssnano',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://opencollective.com/cssnano',
          label: 'Donate',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              to: 'docs/introduction',
              label: 'Guide',
            },
            {
              to: 'docs/optimisations',
              label: 'Optimizations',
            },
            { to: 'playground', label: 'Playground' },
            { to: 'docs/support_us', label: 'Support' },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/cssnano',
            },
            {
              label: 'Gitter',
              href: 'https://gitter.im/postcss/postcss',
            },
            {
              href: 'https://opencollective.com/cssnano',
              label: 'Donate',
            },
          ],
        },
        {
          title: 'Social',
          items: [
            {
              label: 'Blog',
              to: 'blog',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/cssnano/cssnano',
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/cssnano_',
            },
          ],
        },
      ],
      copyright: `Latest release v4.1.10 · Distributed under the MIT License.`,
    },
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          editUrl: 'https://github.com/cssnano/cssnano/edit/master/website/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      },
    ],
  ],
  stylesheets: ['https://at-ui.github.io/feather-font/css/iconfont.css', ''],
  plugins: [require.resolve('./docusaurus-webpack-plugin')],
};

module.exports = {
  title: 'CSSNANO',
  tagline: `Deliver your website's styles, faster.`,
  url: 'https://cssnano.netlify.com', // url to your site with no trailing slash
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'cssnano', // Usually your GitHub org/user name.
  projectName: 'cssnano', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: 'CSSNANO',

      hideOnScroll: true,
      logo: {
        alt: 'CSSNANO Logo',
        src: 'img/logo.svg',
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
        { to: 'blog', label: 'Blog', position: 'left' },
        { to: 'docs/support_us', label: 'Support Us', position: 'left' },
        {
          href: 'https://github.com/cssnano/cssnano',
          label: 'GitHub',
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
              label: 'Style Guide',
              to: 'docs/doc1',
            },
            {
              label: 'Second Doc',
              to: 'docs/doc2',
            },
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
              label: 'Discord',
              href: 'https://discordapp.com/invite/cssnano',
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
              href: 'https://twitter.com/cssnano',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} My Project, Inc. Built with cssnano.`,
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
};

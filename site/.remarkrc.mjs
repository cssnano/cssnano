import remarkHeadingGap from 'remark-heading-gap';
import remarkBookmarks from 'remark-bookmarks';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';

const bookmarks = {
  /* Packages */
  autoprefixer: 'https://github.com/postcss/autoprefixer',
  browserslist: 'https://github.com/ai/browserslist',
  'css-size': 'https://npmjs.org/package/css-size',
  /* Documentation/Online */
  'node.js': 'https://nodejs.org',
  npm: 'https://npmjs.com',
  postcss: 'http://postcss.org',
  /* Guides */
  guidePresets: '/guides/presets',
  guideGettingStarted: '/guides/getting-started',
  guideAdvancedTransforms: '/guides/advanced-transforms',
  guideContributing: '/guides/contributing',
};

export default {
  settings: {
    bullet: '-',
    fences: true,
    listItemIndent: '1',
    paddedTable: false,
  },

  plugins: [
    [remarkHeadingGap, {}],
    [remarkBookmarks, { bookmarks }],
    [remarkFrontmatter],
    [remarkGfm],
  ],
};

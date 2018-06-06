const bookmarks = {
    /* Packages */
    'autoprefixer': 'https://github.com/postcss/autoprefixer',
    'browserslist': 'https://github.com/ai/browserslist',
    'css-size': 'https://npmjs.org/package/css-size',
    /* Documentation/Online */
    'node.js': 'https://nodejs.org',
    'npm': 'https://npmjs.com',
    'postcss': 'http://postcss.org',
    /* Guides */
    'guidePresets': '/guides/presets',
    'guideGettingStarted': '/guides/getting-started',
    'guideAdvancedTransforms': '/guides/advanced-transforms',
    'guideContributing': '/guides/contributing',
};

exports.settings = {
    bullet: '-',
    fences: true,
    listItemIndent: '1',
    paddedTable: false,
};

exports.plugins = [
    [require('remark-heading-gap'), {}],
    [require('remark-bookmarks'), {bookmarks}],
    [require('remark-frontmatter')]
];

module.exports = {
  collectCoverageFrom: [
    'packages/*/src/**/*.js',
    '!packages/postcss-colormin/src/generate.js',
    '!packages/postcss-reduce-initial/src/acquire.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '_processCSS.js',
    '_processCss.js',
    '_webpack.config.js',
    'packages/postcss-lowercase-text/src/__tests__/data/',
  ],
};

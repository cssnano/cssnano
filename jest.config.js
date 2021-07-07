module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'packages/*/src/**/*.js',
    '!packages/postcss-colormin/src/generate.js',
    '!packages/postcss-reduce-initial/src/acquire.js',
    '!packages/cssnano/src/__tests__/_processCss.js',
    '!packages/cssnano/src/__tests__/_webpack.config.js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '_processCSS.js',
    '_processCss.js',
    '_webpack.config.js',
  ],
  testTimeout: 30000,
};

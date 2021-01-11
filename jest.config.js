module.exports = {
  testEnvironment: 'node',
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
  ],
  testTimeout: 30000,
};

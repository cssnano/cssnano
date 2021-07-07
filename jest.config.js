module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'packages/*/src/**/*.js',
    'packages/postcss-reduce-initial/src/script/lib/io.mjs',
    'packages/postcss-reduce-initial/src/script/lib/mdnCssProps.mjs',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '_processCSS.js',
    '_processCss.js',
    '_webpack.config.js',
  ],
  testTimeout: 30000,
  transform: {
    '\\.[jt]sx?$': 'babel-jest',
    '\\.mjs$': 'babel-jest',
  },
};

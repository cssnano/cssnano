const webpack = require('webpack');
const path = require('node:path');

module.exports = {
  mode: 'production',
  context: path.resolve(__dirname),
  cache: {
    type: 'filesystem',
  },
  entry: {
    playground: './src/playground.js',
  },
  output: {
    path: path.resolve(__dirname, '_site/js'),
    filename: '[name].bundle.js',
    clean: true,
  },
  optimization: {
    runtimeChunk: 'single',
    chunkIds: 'deterministic',
    splitChunks: {
      chunks: 'all',
    },
  },
  resolve: {
    /* Unfortunately the SVGO browser build does not resolve otherwise */
    alias: {
      svgo: path.resolve(__dirname, './node_modules/svgo/dist/svgo.browser.js'),
    },
  },
  plugins: [
    new webpack.EnvironmentPlugin({ BROWSERSLIST_DISABLE_CACHE: true }),
  ],
  experiments: {
    outputModule: true,
    futureDefaults: true,
  },
};

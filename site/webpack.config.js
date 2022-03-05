const webpack = require('webpack');
const path = require('path');

module.exports = {
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
    fallback: {
      path: require.resolve('path-browserify'),
      os: require.resolve('os-browserify/browser'),
      fs: false,
      url: false,
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

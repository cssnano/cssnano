const webpack = require('webpack');

module.exports = function () {
  return {
    name: 'webpack-cssnano-docusaurus-plugin',
    configureWebpack() {
      return {
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
      };
    },
  };
};

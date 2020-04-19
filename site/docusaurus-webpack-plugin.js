module.exports = function (context, options) {
  return {
    name: 'webpack-cssnano-docusaurus-plugin',
    async configureWebpack(config, isServer, utils) {
      config.node = {
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
      };
    },
  };
};

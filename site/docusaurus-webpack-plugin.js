module.exports = function () {
  return {
    name: 'webpack-cssnano-docusaurus-plugin',
    async configureWebpack(config) {
      config.node = {
        fs: 'empty',
        net: 'empty',
        tls: 'empty',
      };
    },
  };
};

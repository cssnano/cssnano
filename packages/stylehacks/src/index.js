import browserslist from 'browserslist';
import plugins from './plugins';

function pluginCreator(opts = {}) {
  return {
    postcssPlugin: 'stylehacks',

    OnceExit(css, { result }) {
      const resultOpts = result.opts || {};
      const browsers = browserslist(null, {
        stats: resultOpts.stats,
        path: __dirname,
        env: resultOpts.env,
      });
      const processors = plugins.reduce((list, Plugin) => {
        const hack = new Plugin(result);
        const applied = browsers.some((browser) => {
          return hack.targets.some((target) => browser === target);
        });

        if (applied) {
          return list;
        }

        return [...list, hack];
      }, []);

      css.walk((node) => {
        processors.forEach((proc) => {
          if (!proc.nodeTypes.includes(node.type)) {
            return;
          }

          if (opts.lint) {
            return proc.detectAndWarn(node);
          }

          return proc.detectAndResolve(node);
        });
      });
    },
  };
}

pluginCreator.detect = (node) => {
  return plugins.some((Plugin) => {
    const hack = new Plugin();

    return hack.any(node);
  });
};

pluginCreator.postcss = true;
export default pluginCreator;

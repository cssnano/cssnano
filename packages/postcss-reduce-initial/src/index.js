import { plugin } from 'postcss';
import browserslist from 'browserslist';
import { isSupported } from 'caniuse-api';
import transform from './lib/transform';

export default plugin('postcss-reduce-initial', () => {
  return (css, result) => {
    const resultOpts = result.opts || {};
    const browsers = browserslist(null, {
      stats: resultOpts.stats,
      path: __dirname,
      env: resultOpts.env,
    });

    const initialSupport = isSupported('css-initial-value', browsers);

    css.walkDecls((decl) => {
      if (!decl.value) {
        return;
      }

      decl.value = transform(
        initialSupport,
        decl.prop.toLowerCase(),
        decl.value
      );
    });
  };
});

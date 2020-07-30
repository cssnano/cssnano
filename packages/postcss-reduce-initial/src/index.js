import { plugin } from 'postcss';
import has from 'has';
import browserslist from 'browserslist';
import { isSupported } from 'caniuse-api';
import fromInitial from '../data/fromInitial.json';
import toInitial from '../data/toInitial.json';

const initial = 'initial';

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
      const lowerCasedProp = decl.prop.toLowerCase();
      if (resultOpts.ignore && !!~resultOpts.ignore.indexOf(lowerCasedProp)) {
        return;
      }

      if (
        initialSupport &&
        has(toInitial, lowerCasedProp) &&
        decl.value.toLowerCase() === toInitial[lowerCasedProp]
      ) {
        decl.value = initial;
        return;
      }

      if (
        decl.value.toLowerCase() !== initial ||
        !fromInitial[lowerCasedProp]
      ) {
        return;
      }

      decl.value = fromInitial[lowerCasedProp];
    });
  };
});

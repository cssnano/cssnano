import browserslist from 'browserslist';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import * as R from 'ramda';
import cacheFn from './lib/cacheFn';
import canConvertToWildcardRange from './lib/canConvertToWildcardRange';
import includedIn from './lib/includedIn';
import isIntervalRange from './lib/isIntervalRange';
import parseIntervalRange from './lib/parseIntervalRange';

const isSymmetric = R.apply(R.equals);

function reduceIntervalRange(value) {
  const [left, right] = parseIntervalRange(value);

  if (!R.eqProps('length', left, right)) {
    return value;
  }

  const wildcardRange = R.compose(
    R.reduceRight((pair, acc) => {
      if (acc === null) {
        return acc;
      }
      if (canConvertToWildcardRange(pair, acc)) {
        return `?${acc}`;
      }
      return isSymmetric(pair) ? `${pair[0]}${acc}` : null;
    }, ''),
    R.zip
  )(left, right);

  return wildcardRange === null ? value : `u+${wildcardRange}`;
}

/*
 * IE and Edge before 16 version ignore the unicode-range if the 'U' is lowercase
 *
 * https://caniuse.com/#search=unicode-range
 */

const hasLowerCaseUPrefixBug = includedIn(browserslist('ie <=11, edge <= 15'));

const replaceLowerCaseUPrefix = R.replace(/^u(?=\+)/, 'U');

const transform = cacheFn((value, isLegacy = false) =>
  valueParser(value)
    .walk((child) => {
      if (isIntervalRange(child)) {
        child.value = R.compose(
          R.when(() => isLegacy, replaceLowerCaseUPrefix),
          reduceIntervalRange,
          R.toLower
        )(child.value);
      }

      return false;
    })
    .toString()
);

export default postcss.plugin('postcss-normalize-unicode', () => {
  return (css, result) => {
    const resultOpts = result.opts || {};
    const browsers = browserslist(null, {
      stats: resultOpts.stats,
      path: __dirname,
      env: resultOpts.env,
    });
    const isLegacy = browsers.some(hasLowerCaseUPrefixBug);

    css.walkDecls(/^unicode-range$/i, (decl) => {
      const { value } = decl;

      if (!value) {
        return;
      }

      decl.value = transform(value, isLegacy);
    });
  };
});

import browserslist from 'browserslist';
import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

const regexLowerCaseUPrefix = /^u(?=\+)/;

function unicode(range) {
  const values = range.slice(2).split('-');

  if (values.length < 2) {
    return range;
  }

  const left = values[0].split('');
  const right = values[1].split('');

  if (left.length !== right.length) {
    return range;
  }

  let questionCounter = 0;

  const merged = left.reduce((group, value, index) => {
    if (group === false) {
      return false;
    }

    if (value === right[index] && !questionCounter) {
      return group + value;
    }

    if (value === '0' && right[index] === 'f') {
      questionCounter++;
      return group + '?';
    }

    return false;
  }, 'u+');

  // The maximum number of wildcard characters (?) for ranges is 5.
  if (merged && questionCounter < 6) {
    return merged;
  }

  return range;
}

/*
 * IE and Edge before 16 version ignore the unicode-range if the 'U' is lowercase
 *
 * https://caniuse.com/#search=unicode-range
 */

function hasLowerCaseUPrefixBug(browser) {
  return ~browserslist('ie <=11, edge <= 15').indexOf(browser);
}

function transform(value, isLegacy = false) {
  return valueParser(value)
    .walk((child) => {
      if (child.type === 'word') {
        const transformed = unicode(child.value.toLowerCase());

        child.value = isLegacy
          ? transformed.replace(regexLowerCaseUPrefix, 'U')
          : transformed;
      }

      return false;
    })
    .toString();
}

export default postcss.plugin('postcss-normalize-unicode', () => {
  return (css, result) => {
    const resultOpts = result.opts || {};
    const browsers = browserslist(null, {
      stats: resultOpts.stats,
      path: __dirname,
      env: resultOpts.env,
    });
    const isLegacy = browsers.some(hasLowerCaseUPrefixBug);
    const cache = {};

    css.walkDecls(/^unicode-range$/i, (decl) => {
      const value = decl.value;

      if (cache[value]) {
        decl.value = cache[value];

        return;
      }

      const newValue = transform(value, isLegacy);

      decl.value = newValue;
      cache[value] = newValue;
    });
  };
});

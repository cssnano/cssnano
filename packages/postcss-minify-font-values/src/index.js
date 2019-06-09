import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import * as R from 'ramda';
import cacheFn from './lib/cacheFn';
import minifyWeight from './lib/minify-weight';
import minifyFamily from './lib/minify-family';
import minifyFont from './lib/minify-font';

const hasVariableFunction = R.compose(
  R.anyPass([R.includes('constant('), R.includes('var('), R.includes('env(')]),
  R.toLower
);

const transform = cacheFn((prop, value, opts) => {
  const lowerCasedProp = prop.toLowerCase();

  if (lowerCasedProp === 'font-weight' && !hasVariableFunction(value)) {
    return minifyWeight(value);
  } else if (lowerCasedProp === 'font-family' && !hasVariableFunction(value)) {
    const tree = valueParser(value);

    tree.nodes = minifyFamily(tree.nodes, opts);

    return tree.toString();
  } else if (lowerCasedProp === 'font') {
    const tree = valueParser(value);

    tree.nodes = minifyFont(tree.nodes, opts);

    return tree.toString();
  }

  return value;
});

export default postcss.plugin('postcss-minify-font-values', (opts) => {
  opts = Object.assign(
    {},
    {
      removeAfterKeyword: false,
      removeDuplicates: true,
      removeQuotes: true,
    },
    opts
  );

  return (css) => {
    css.walkDecls(/font/i, (decl) => {
      const { prop, value } = decl;

      if (!value) {
        return;
      }

      decl.value = transform(prop, value, opts);
    });
  };
});

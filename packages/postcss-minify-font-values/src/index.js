import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import minifyWeight from './lib/minify-weight';
import minifyFamily from './lib/minify-family';
import minifyFont from './lib/minify-font';

function hasVariableFunction(value) {
  const lowerCasedValue = value.toLowerCase();

  return lowerCasedValue.includes('var(') || lowerCasedValue.includes('env(');
}

function transform(prop, value, opts) {
  let lowerCasedProp = prop.toLowerCase();

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
}

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
    const cache = {};

    css.walkDecls(/font/i, (decl) => {
      const value = decl.value;

      if (!value) {
        return;
      }

      const prop = decl.prop;

      const cacheKey = `${prop}|${value}`;

      if (cache[cacheKey]) {
        decl.value = cache[cacheKey];

        return;
      }

      const newValue = transform(prop, value, opts);

      decl.value = newValue;
      cache[cacheKey] = newValue;
    });
  };
});

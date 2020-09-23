import valueParser from 'postcss-value-parser';
import minifyWeight from './lib/minify-weight';
import minifyFamily from './lib/minify-family';
import minifyFont from './lib/minify-font';

const postcssPlugin = 'postcss-minify-font-values';

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

export default (opts) => {
  opts = Object.assign(
    {},
    {
      removeAfterKeyword: false,
      removeDuplicates: true,
      removeQuotes: true,
    },
    opts
  );
  const cache = {};
  return {
    postcssPlugin,
    Declaration(decl) {
      if (/font/i.test(decl.prop)) {
        const value = decl.value;

        if (value) {
          const prop = decl.prop;

          const cacheKey = `${prop}|${value}`;

          if (cache[cacheKey]) {
            decl.value = cache[cacheKey];
          } else {
            const newValue = transform(prop, value, opts);

            decl.value = newValue;
            cache[cacheKey] = newValue;
          }
        }
      }
    },
  };
};

export const postcss = true;

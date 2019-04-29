import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import minifyWeight from './lib/minify-weight';
import minifyFamily from './lib/minify-family';
import minifyFont from './lib/minify-font';

function hasCssVariables(value) {
  const lowerCasedValue = value.toLowerCase();

  return lowerCasedValue.includes('var(');
}

function transform(opts, decl) {
  if (!decl.value) {
    return;
  }

  let lowerCasedProp = decl.prop.toLowerCase();

  if (lowerCasedProp === 'font-weight' && !hasCssVariables(decl.value)) {
    decl.value = minifyWeight(decl.value);
  } else if (lowerCasedProp === 'font-family' && !hasCssVariables(decl.value)) {
    const tree = valueParser(decl.value);

    tree.nodes = minifyFamily(tree.nodes, opts);
    decl.value = tree.toString();
  } else if (lowerCasedProp === 'font') {
    const tree = valueParser(decl.value);

    tree.nodes = minifyFont(tree.nodes, opts);
    decl.value = tree.toString();
  }
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

  return (css) => css.walkDecls(/font/i, transform.bind(null, opts));
});

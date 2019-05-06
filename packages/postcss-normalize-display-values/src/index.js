import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'lerna:cssnano-util-get-match';
import mappings from './lib/map';

function transform(value) {
  const { nodes } = valueParser(value);

  if (nodes.length === 1) {
    return value;
  }

  const values = nodes
    .filter((list, index) => index % 2 === 0)
    .filter((node) => node.type === 'word')
    .map((n) => n.value.toLowerCase());

  if (values.length === 0) {
    return value;
  }

  const match = getMatchFactory(mappings)(values);

  if (!match) {
    return value;
  }

  return match;
}

export default postcss.plugin('postcss-normalize-display-values', () => {
  return (css) => {
    const cache = {};

    css.walkDecls(/display/i, (decl) => {
      const value = decl.value;

      if (!value) {
        return;
      }

      if (cache[value]) {
        decl.value = cache[value];

        return;
      }

      const result = transform(value);

      decl.value = result;
      cache[value] = result;
    });
  };
});

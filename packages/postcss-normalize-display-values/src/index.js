import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'lerna:cssnano-util-get-match';
import mappings from './lib/map';

export default postcss.plugin('postcss-normalize-display-values', () => {
  return (css) => {
    const cache = {};

    css.walkDecls(/display/i, (decl) => {
      const value = decl.value;

      if (cache[value]) {
        decl.value = cache[value];

        return;
      }

      const { nodes } = valueParser(value);

      if (nodes.length === 1) {
        cache[value] = value;

        return;
      }

      const values = nodes
        .filter((list, index) => {
          return index % 2 === 0;
        })
        .filter((node) => {
          return node.type === 'word';
        })
        .map((n) => n.value.toLowerCase());

      if (values.length === 0) {
        return;
      }

      const match = getMatchFactory(mappings)(values);

      if (!match) {
        cache[value] = value;

        return;
      }

      const result = match;

      decl.value = result;
      cache[value] = result;
    });
  };
});

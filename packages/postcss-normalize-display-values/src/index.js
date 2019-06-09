import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import getMatchFactory from 'lerna:cssnano-util-get-match';
import * as R from 'ramda';
import cacheFn from './lib/cacheFn';
import mappings from './lib/map';
import takeEvenValues from './lib/takeEvenValues';

const getMatch = getMatchFactory(mappings);

const getWordNodes = R.compose(
  takeEvenValues,
  R.filter(R.propEq('type', 'word')),
  R.map((n) => n.value.toLowerCase())
);

const transform = cacheFn((value) => {
  const { nodes } = valueParser(value);

  if (nodes.length === 1) {
    return value;
  }

  const values = R.into([], getWordNodes)(nodes);

  if (values.length === 0) {
    return value;
  }

  const match = getMatch(values);

  return match ? match : value;
});

export default postcss.plugin('postcss-normalize-display-values', () => {
  return (css) => {
    css.walkDecls(/^display$/i, (decl) => {
      const { value } = decl;

      if (!value) {
        return;
      }

      decl.value = transform(value);
    });
  };
});

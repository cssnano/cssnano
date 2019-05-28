import postcss from 'postcss';
import valueParser, { stringify } from 'postcss-value-parser';
import * as R from 'ramda';
import cacheFn from './lib/cacheFn';
import isFunctionNode from './lib/isFunctionNode';
import isVariableFunctionNode from './lib/isVariableFunctionNode';
import reducers from './reducers';

const isVariableFunctionNodeWithOneChild = R.both(
  isVariableFunctionNode,
  R.pathEq(['nodes', 'length'], 1)
);

function getValues(list, node, index) {
  if (index % 2 === 0) {
    let value = NaN;

    if (isVariableFunctionNodeWithOneChild(node)) {
      value = stringify(node.nodes);
    } else if (node.type === 'word') {
      value = parseFloat(node.value);
    }

    return [...list, value];
  }

  return list;
}

const normalizeReducerName = R.compose(
  R.when(R.equals('rotatez'), () => 'rotateZ'),
  R.toLower
);

function reduce(node) {
  const { nodes, value } = node;
  const normalizedReducerName = normalizeReducerName(value);

  if (isFunctionNode(node) && R.has(normalizedReducerName, reducers)) {
    reducers[normalizedReducerName](node, nodes.reduce(getValues, []));
  }

  return false;
}

const transformDecl = cacheFn((value) =>
  valueParser(value)
    .walk(reduce)
    .toString()
);

export default postcss.plugin('postcss-reduce-transforms', () => {
  return (css) => {
    css.walkDecls(/transform$/i, (decl) => {
      const { value } = decl;

      if (!value) {
        return;
      }

      decl.value = transformDecl(value);
    });
  };
});

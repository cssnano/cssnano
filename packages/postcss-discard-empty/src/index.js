import postcss from 'postcss';
import * as R from 'ramda';

const plugin = 'postcss-discard-empty';

const hasNodes = R.has('nodes');

const falsey = R.complement(Boolean);

const falseyProp = R.propSatisfies(falsey);

const hasNoChildren = R.pathSatisfies(falsey, ['nodes', 'length']);

const isEmptyDecl = R.both(R.propEq('type', 'decl'), falseyProp('value'));

const isEmptyRule = R.both(
  R.propEq('type', 'rule'),
  R.either(falseyProp('selector'), hasNoChildren)
);

const isEmptyAtRule = R.both(
  R.propEq('type', 'atrule'),
  R.either(
    R.compose(
      R.all(falsey),
      R.props(['nodes', 'params'])
    ),
    R.both(hasNodes, hasNoChildren)
  )
);

const isEmpty = R.anyPass([isEmptyAtRule, isEmptyDecl, isEmptyRule]);

function discardAndReport(css, result) {
  function discardEmpty(node) {
    if (hasNodes(node)) {
      node.each(discardEmpty);
    }

    if (isEmpty(node)) {
      node.remove();

      result.messages.push({
        type: 'removal',
        plugin,
        node,
      });
    }
  }

  css.each(discardEmpty);
}

export default postcss.plugin(plugin, () => discardAndReport);

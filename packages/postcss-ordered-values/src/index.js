import postcss from 'postcss';
import valueParser from 'postcss-value-parser';
import * as R from 'ramda';
import isVariableFunctionNode from './lib/isVariableFunctionNode';
import nodeValueIncludes from './lib/nodeValueIncludes';

// rules
import animation from './rules/animation';
import border from './rules/border';
import boxShadow from './rules/boxShadow';
import flexFlow from './rules/flexFlow';
import transition from './rules/transition';

const rules = {
  animation: animation,
  border: border,
  'border-top': border,
  'border-right': border,
  'border-bottom': border,
  'border-left': border,
  outline: border,
  'box-shadow': boxShadow,
  'flex-flow': flexFlow,
  transition: transition,
};

const hasOneNode = R.pathSatisfies(R.gt(2), ['nodes', 'length']);

const shouldAbort = R.either(
  hasOneNode,
  R.compose(
    R.any(
      R.anyPass([
        R.propEq('type', 'comment'),
        nodeValueIncludes(`___CSS_LOADER_IMPORT___`),
        isVariableFunctionNode,
      ])
    ),
    R.prop('nodes')
  )
);

const getValue = R.either(R.path(['raws', 'value', 'raw']), R.prop('value'));

const propOf = R.flip(R.prop);

const getProcessor = R.compose(
  propOf(rules),
  postcss.vendor.unprefixed,
  R.toLower,
  R.prop('prop')
);

export default postcss.plugin('postcss-ordered-values', () => {
  return (css) => {
    const cache = {};

    css.walkDecls((decl) => {
      const processor = getProcessor(decl);

      if (!processor) {
        return;
      }

      const value = getValue(decl);

      if (cache[value]) {
        decl.value = cache[value];

        return;
      }

      const parsed = valueParser(value);

      if (shouldAbort(parsed)) {
        cache[value] = value;

        return;
      }

      const result = processor(parsed);

      decl.value = result;
      cache[value] = result;
    });
  };
});

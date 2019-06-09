import postcss from 'postcss';
import valueParser, { unit, stringify } from 'postcss-value-parser';
import getArguments from 'lerna:cssnano-util-get-arguments';
import isColorStop from 'is-color-stop';
import * as R from 'ramda';
import cacheFn from './cacheFn';
import isFunctionNode from './isFunctionNode';
import isNodeValueEqual from './isNodeValueEqual';

const angles = {
  top: '0deg',
  right: '90deg',
  bottom: '180deg',
  left: '270deg',
};

function isLessThan(a, b) {
  return (
    a.unit.toLowerCase() === b.unit.toLowerCase() &&
    parseFloat(a.number) >= parseFloat(b.number)
  );
}

const stringifyFunction = (node) => `${node.value}(${stringify(node.nodes)})`;

const stringifyNode = R.ifElse(
  isFunctionNode,
  stringifyFunction,
  R.prop('value')
);

const shouldAbort = R.anyPass([
  R.complement(R.includes)('gradient'),
  R.includes('constant('),
  R.includes('var('),
  R.includes('env('),
]);

const optimise = cacheFn((value) => {
  const normalizedValue = value.toLowerCase();

  if (shouldAbort(normalizedValue)) {
    return value;
  }

  return valueParser(value)
    .walk((node) => {
      if (!isFunctionNode(node) || !node.nodes.length) {
        return false;
      }

      const lowerCasedValue = node.value.toLowerCase();

      if (
        lowerCasedValue === 'linear-gradient' ||
        lowerCasedValue === 'repeating-linear-gradient' ||
        lowerCasedValue === '-webkit-linear-gradient' ||
        lowerCasedValue === '-webkit-repeating-linear-gradient'
      ) {
        let args = getArguments(node);

        if (isNodeValueEqual('to', node.nodes[0]) && args[0].length === 3) {
          node.nodes = node.nodes.slice(2);
          node.nodes[0].value = angles[node.nodes[0].value.toLowerCase()];
        }

        let lastStop = null;

        args.forEach((arg, index) => {
          if (!arg[2]) {
            return;
          }

          let isFinalStop = index === args.length - 1;
          let thisStop = unit(arg[2].value);

          if (lastStop === null) {
            lastStop = thisStop;

            if (
              !isFinalStop &&
              lastStop &&
              lastStop.number === '0' &&
              lastStop.unit.toLowerCase() !== 'deg'
            ) {
              arg[1].value = arg[2].value = '';
            }

            return;
          }

          if (lastStop && thisStop && isLessThan(lastStop, thisStop)) {
            arg[2].value = 0;
          }

          lastStop = thisStop;

          if (isFinalStop && arg[2].value === '100%') {
            arg[1].value = arg[2].value = '';
          }
        });

        return false;
      }

      if (
        lowerCasedValue === 'radial-gradient' ||
        lowerCasedValue === 'repeating-radial-gradient'
      ) {
        let args = getArguments(node);
        let lastStop;

        const hasAt = args[0].find(isNodeValueEqual('at'));

        args.forEach((arg, index) => {
          if (!arg[2] || (!index && hasAt)) {
            return;
          }

          let thisStop = unit(arg[2].value);

          if (!lastStop) {
            lastStop = thisStop;

            return;
          }

          if (lastStop && thisStop && isLessThan(lastStop, thisStop)) {
            arg[2].value = 0;
          }

          lastStop = thisStop;
        });

        return false;
      }

      if (
        lowerCasedValue === '-webkit-radial-gradient' ||
        lowerCasedValue === '-webkit-repeating-radial-gradient'
      ) {
        let args = getArguments(node);
        let lastStop;

        args.forEach((arg) => {
          let color;
          let stop;

          if (arg[2]) {
            color = stringifyNode(arg[0]);
            stop = stringifyNode(arg[2]);
          } else {
            color = stringifyNode(arg[0]);
          }

          color = color.toLowerCase();

          const colorStop =
            stop || stop === 0
              ? isColorStop(color, stop.toLowerCase())
              : isColorStop(color);

          if (!colorStop || !arg[2]) {
            return;
          }

          let thisStop = unit(arg[2].value);

          if (!lastStop) {
            lastStop = thisStop;

            return;
          }

          if (lastStop && thisStop && isLessThan(lastStop, thisStop)) {
            arg[2].value = 0;
          }

          lastStop = thisStop;
        });

        return false;
      }
    })
    .toString();
});

export default postcss.plugin('postcss-minify-gradients', () => {
  return (css) =>
    css.walkDecls((decl) => {
      const { value } = decl;

      if (!value) {
        return;
      }

      decl.value = optimise(value);
    });
});

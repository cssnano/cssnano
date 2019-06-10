import postcss from 'postcss';
import valueParser, { unit, walk } from 'postcss-value-parser';
import * as R from 'ramda';
import convert from './lib/convert';
import oneOf from './lib/oneOf';
import isFunctionNode from './lib/isFunctionNode';
import isWordNode from './lib/isWordNode';

const isLengthUnit = oneOf([
  'em',
  'ex',
  'ch',
  'rem',
  'vw',
  'vh',
  'vmin',
  'vmax',
  'cm',
  'mm',
  'q',
  'in',
  'pt',
  'pc',
  'px',
]);

function parseWord(node, opts, keepZeroUnit) {
  const pair = unit(node.value);
  if (pair) {
    const num = Number(pair.number);
    const u = pair.unit;
    if (num === 0) {
      node.value = keepZeroUnit || (!isLengthUnit(u) && u !== '%') ? 0 + u : 0;
    } else {
      node.value = convert(num, u, opts);

      if (
        R.is(Number, opts.precision) &&
        R.toLower(u) === 'px' &&
        R.includes('.', pair.number)
      ) {
        const precision = Math.pow(10, opts.precision);
        node.value =
          Math.round(parseFloat(node.value) * precision) / precision + u;
      }
    }
  }
}

function clampValue(node) {
  const pair = unit(node.value);
  if (!pair) {
    return;
  }
  let num = Number(pair.number);
  if (num > 1) {
    node.value = 1 + pair.unit;
  } else if (num < 0) {
    node.value = 0 + pair.unit;
  }
}

const grandParentName = R.compose(
  R.unless(R.isNil, R.toLower),
  R.path(['parent', 'parent', 'name'])
);

function shouldKeepPercent(decl) {
  const lowerCasedProp = decl.prop.toLowerCase();

  return (
    (R.includes('%', decl.value) &&
      R.includes(lowerCasedProp, ['max-height', 'height'])) ||
    (grandParentName(decl) === 'keyframes' &&
      R.includes(lowerCasedProp, [
        'stroke-dasharray',
        'stroke-dashoffset',
        'stroke-width',
      ]))
  );
}

const shouldAbort = R.either(R.includes('flex'), R.startsWith('--'));

function transform(opts, decl) {
  const lowerCasedProp = decl.prop.toLowerCase();
  if (shouldAbort(lowerCasedProp)) {
    return;
  }

  decl.value = valueParser(decl.value)
    .walk((node) => {
      const lowerCasedValue = node.value.toLowerCase();

      if (isWordNode(node)) {
        parseWord(node, opts, shouldKeepPercent(decl));
        if (R.includes(lowerCasedProp, ['opacity', 'shape-image-threshold'])) {
          clampValue(node);
        }
      } else if (isFunctionNode(node)) {
        if (R.includes(lowerCasedValue, ['calc', 'hsl', 'hsla'])) {
          walk(node.nodes, (n) => {
            if (isWordNode(n)) {
              parseWord(n, opts, true);
            }
          });
          return false;
        }
        if (lowerCasedValue === 'url') {
          return false;
        }
      }
    })
    .toString();
}

const plugin = 'postcss-convert-values';

export default postcss.plugin(plugin, (opts = { precision: false }) => {
  return (css) => css.walkDecls(transform.bind(null, opts));
});

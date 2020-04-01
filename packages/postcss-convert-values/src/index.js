import postcss from 'postcss';
import valueParser, { unit, walk } from 'postcss-value-parser';
import convert from './lib/convert';

const LENGTH_UNITS = [
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
];

function parseWord(node, opts, keepZeroUnit) {
  const pair = unit(node.value);
  if (pair) {
    const num = Number(pair.number);
    const u = pair.unit;
    if (num === 0) {
      node.value =
        keepZeroUnit || (!~LENGTH_UNITS.indexOf(u.toLowerCase()) && u !== '%')
          ? 0 + u
          : 0;
    } else {
      node.value = convert(num, u, opts);

      if (
        typeof opts.precision === 'number' &&
        u.toLowerCase() === 'px' &&
        ~pair.number.indexOf('.')
      ) {
        const precision = Math.pow(10, opts.precision);
        node.value =
          Math.round(parseFloat(node.value) * precision) / precision + u;
      }
    }
  }
}

function clampOpacity(node) {
  const pair = unit(node.value);
  if (!pair) {
    return;
  }
  let num = Number(pair.number);
  if (num > 1) {
    node.value = pair.unit === '%' ? num + pair.unit : 1 + pair.unit;
  } else if (num < 0) {
    node.value = 0 + pair.unit;
  }
}

function shouldKeepUnit(decl) {
  const { parent } = decl;
  const lowerCasedProp = decl.prop.toLowerCase();
  return (
    (~decl.value.indexOf('%') &&
      (lowerCasedProp === 'max-height' || lowerCasedProp === 'height')) ||
    (parent.parent &&
      parent.parent.name &&
      parent.parent.name.toLowerCase() === 'keyframes' &&
      lowerCasedProp === 'stroke-dasharray') ||
    lowerCasedProp === 'stroke-dashoffset' ||
    lowerCasedProp === 'stroke-width' ||
    lowerCasedProp === 'line-height'
  );
}

function transform(opts, decl) {
  const lowerCasedProp = decl.prop.toLowerCase();
  if (~lowerCasedProp.indexOf('flex') || lowerCasedProp.indexOf('--') === 0) {
    return;
  }

  decl.value = valueParser(decl.value)
    .walk((node) => {
      const lowerCasedValue = node.value.toLowerCase();

      if (node.type === 'word') {
        parseWord(node, opts, shouldKeepUnit(decl));
        if (
          lowerCasedProp === 'opacity' ||
          lowerCasedProp === 'shape-image-threshold'
        ) {
          clampOpacity(node);
        }
      } else if (node.type === 'function') {
        if (
          lowerCasedValue === 'calc' ||
          lowerCasedValue === 'hsl' ||
          lowerCasedValue === 'hsla'
        ) {
          walk(node.nodes, (n) => {
            if (n.type === 'word') {
              parseWord(n, opts, true);
            }
          });
          return false;
        }
        if (
          lowerCasedValue === 'url' ||
          lowerCasedValue === 'min' ||
          lowerCasedValue === 'max' ||
          lowerCasedValue === 'clamp'
        ) {
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

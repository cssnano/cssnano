import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

// rules
import animation from './rules/animation';
import border from './rules/border';
import boxShadow from './rules/boxShadow';
import flexFlow from './rules/flexFlow';
import transition from './rules/transition';
import columns from './rules/columns';

const borderRules = {
  border: border,
  'border-block': border,
  'border-inline': border,
  'border-block-end': border,
  'border-block-start': border,
  'border-inline-end': border,
  'border-inline-start': border,
  'border-top': border,
  'border-right': border,
  'border-bottom': border,
  'border-left': border,
};

const columnRules = {
  'column-rule': border,
  columns,
};

const rules = {
  animation: animation,
  outline: border,
  'box-shadow': boxShadow,
  'flex-flow': flexFlow,
  transition: transition,
  ...borderRules,
  ...columnRules,
};

function isVariableFunctionNode(node) {
  if (node.type !== 'function') {
    return false;
  }

  return ['var', 'env'].includes(node.value.toLowerCase());
}

function shouldAbort(parsed) {
  let abort = false;

  parsed.walk((node) => {
    if (
      node.type === 'comment' ||
      isVariableFunctionNode(node) ||
      (node.type === 'word' && ~node.value.indexOf(`___CSS_LOADER_IMPORT___`))
    ) {
      abort = true;

      return false;
    }
  });

  return abort;
}

function getValue(decl) {
  let { value, raws } = decl;

  if (raws && raws.value && raws.value.raw) {
    value = raws.value.raw;
  }

  return value;
}

export default postcss.plugin('postcss-ordered-values', () => {
  return (css) => {
    const cache = {};

    css.walkDecls((decl) => {
      const lowerCasedProp = decl.prop.toLowerCase();
      const normalizedProp = postcss.vendor.unprefixed(lowerCasedProp);
      const processor = rules[normalizedProp];

      if (!processor) {
        return;
      }

      const value = getValue(decl);

      if (cache[value]) {
        decl.value = cache[value];

        return;
      }

      const parsed = valueParser(value);

      if (parsed.nodes.length < 2 || shouldAbort(parsed)) {
        cache[value] = value;

        return;
      }

      const result = processor(parsed);

      decl.value = result;
      cache[value] = result;
    });
  };
});

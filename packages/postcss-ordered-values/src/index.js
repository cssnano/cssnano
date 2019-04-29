import postcss from 'postcss';
import valueParser from 'postcss-value-parser';

// rules
import animation from './rules/animation';
import border from './rules/border';
import boxShadow from './rules/boxShadow';
import flexFlow from './rules/flexFlow';
import transition from './rules/transition';

/* eslint-disable quote-props */

const rules = {
  animation: animation,
  '-webkit-animation': animation,
  border: border,
  'border-top': border,
  'border-right': border,
  'border-bottom': border,
  'border-left': border,
  outline: border,
  'box-shadow': boxShadow,
  'flex-flow': flexFlow,
  transition: transition,
  '-webkit-transition': transition,
};

/* eslint-enable */

function shouldAbort(parsed) {
  let abort = false;

  parsed.walk(({ type, value }) => {
    if (
      type === 'comment' ||
      (type === 'function' && value.toLowerCase() === 'var') ||
      (type === 'word' && ~value.indexOf(`___CSS_LOADER_IMPORT___`))
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
      const processor = rules[lowerCasedProp];

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

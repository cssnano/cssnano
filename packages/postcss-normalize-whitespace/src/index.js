import valueParser from 'postcss-value-parser';

function reduceCalcWhitespaces(node) {
  if (node.type === 'space') {
    node.value = ' ';
  } else if (node.type === 'function') {
    if (!['var', 'env', 'constant'].includes(node.value.toLowerCase())) {
      node.before = node.after = '';
    }
  }
}

function reduceWhitespaces(node) {
  if (node.type === 'space') {
    node.value = ' ';
  } else if (node.type === 'div') {
    node.before = node.after = '';
  } else if (node.type === 'function') {
    if (!['var', 'env', 'constant'].includes(node.value.toLowerCase())) {
      node.before = node.after = '';
    }
    if (node.value.toLowerCase() === 'calc') {
      valueParser.walk(node.nodes, reduceCalcWhitespaces);
      return false;
    }
  }
}

const pluginCreator = () => {
  return {
    postcssPlugin: 'postcss-normalize-whitespace',
    prepare() {
      const cache = {};
      return {
        Declaration(node) {
          if (node.raws.before) {
            node.raws.before = node.raws.before.replace(/\s/g, '');
          }
          // Ensure that !important values do not have any excess whitespace
          if (node.important) {
            node.raws.important = '!important';
          }

          // Remove whitespaces around ie 9 hack
          node.value = node.value.replace(/\s*(\\9)\s*/, '$1');

          const value = node.value;

          if (cache[value]) {
            node.value = cache[value];
          } else {
            const parsed = valueParser(node.value);
            const result = parsed.walk(reduceWhitespaces).toString();

            // Trim whitespace inside functions & dividers
            node.value = result;
            cache[value] = result;
          }

          // Remove extra semicolons and whitespace before the declaration
          if (node.raws.before) {
            const prev = node.prev();

            if (prev && prev.type !== 'rule') {
              node.raws.before = node.raws.before.replace(/;/g, '');
            }
          }

          node.raws.between = ':';
          node.raws.semicolon = false;
        },
        Rule(node) {
          if (node.raws.before) {
            node.raws.before = node.raws.before.replace(/\s/g, '');
          }

          node.raws.between = node.raws.after = '';
          node.raws.semicolon = false;
        },
        AtRule(node) {
          if (node.raws.before) {
            node.raws.before = node.raws.before.replace(/\s/g, '');
          }
          node.raws.between = node.raws.after = '';
          node.raws.semicolon = false;
        },
        OnceExit(css) {
          css.raws.after = '';
        },
      };
    },
  };
};

pluginCreator.postcss = true;

export default pluginCreator;

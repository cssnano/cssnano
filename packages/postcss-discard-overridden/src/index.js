const OVERRIDABLE_RULES = ['keyframes', 'counter-style'];
const SCOPE_RULES = ['media', 'supports'];
const postcssPlugin = 'postcss-discard-overridden';

function vendorUnprefixed(prop) {
  return prop.replace(/^-\w+-/, '');
}

function isOverridable(name) {
  return ~OVERRIDABLE_RULES.indexOf(vendorUnprefixed(name.toLowerCase()));
}

function isScope(name) {
  return ~SCOPE_RULES.indexOf(vendorUnprefixed(name.toLowerCase()));
}

function getScope(node) {
  let current = node.parent;

  const chain = [node.name.toLowerCase(), node.params];

  do {
    if (current.type === 'atrule' && isScope(current.name)) {
      chain.unshift(current.name + ' ' + current.params);
    }
    current = current.parent;
  } while (current);

  return chain.join('|');
}

const pluginCreator = () => {
  const cache = {};
  const rules = [];

  return {
    postcssPlugin,
    AtRule(node) {
      if (isOverridable(node.name)) {
        const scope = getScope(node);

        cache[scope] = node;
        rules.push({
          node,
          scope,
        });
      }
    },
    OnceExit() {
      rules.forEach((rule) => {
        if (cache[rule.scope] !== rule.node) {
          rule.node.remove();
        }
      });
    },
  };
};

pluginCreator.postcss = true;

export default pluginCreator;

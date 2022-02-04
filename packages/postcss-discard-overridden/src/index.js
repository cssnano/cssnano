'use strict';
const OVERRIDABLE_RULES = new Set(['keyframes', 'counter-style']);
const SCOPE_RULES = new Set(['media', 'supports']);

function vendorUnprefixed(prop) {
  return prop.replace(/^-\w+-/, '');
}

function isOverridable(name) {
  return OVERRIDABLE_RULES.has(vendorUnprefixed(name.toLowerCase()));
}

function isScope(name) {
  return SCOPE_RULES.has(vendorUnprefixed(name.toLowerCase()));
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

function pluginCreator() {
  return {
    postcssPlugin: 'postcss-discard-overridden',
    prepare() {
      const cache = new Map();
      const rules = [];

      return {
        OnceExit(css) {
          css.walkAtRules((node) => {
            if (isOverridable(node.name)) {
              const scope = getScope(node);

              cache.set(scope, node);
              rules.push({
                node,
                scope,
              });
            }
          });

          rules.forEach((rule) => {
            if (cache.get(rule.scope) !== rule.node) {
              rule.node.remove();
            }
          });
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;

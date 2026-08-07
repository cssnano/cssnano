'use strict';
const OVERRIDABLE_RULES = new Set(['keyframes', 'counter-style']);
const SCOPE_RULES = new Set(['media', 'supports']);
const vendorPrefixPattern = /^-\w+-/;

/**
 * @param {string} prop
 * @return {string}
 */
function vendorUnprefixed(prop) {
  return prop.replace(vendorPrefixPattern, '');
}

/**
 * @param {string} name
 * @return {boolean}
 */
function isOverridable(name) {
  return OVERRIDABLE_RULES.has(vendorUnprefixed(name.toLowerCase()));
}

/**
 * @param {string} name
 * @return {boolean}
 */
function isScope(name) {
  return SCOPE_RULES.has(vendorUnprefixed(name.toLowerCase()));
}

/**
 * @param {import('postcss').AtRule} node
 * @return {string}
 */
function getScope(node) {
  /** @type {import('postcss').Container<import('postcss').ChildNode> | import('postcss').Document | undefined} */
  let current = node.parent;

  const chain = [node.name.toLowerCase(), node.params];

  while (current) {
    if (
      current.type === 'atrule' &&
      isScope(/** @type import('postcss').AtRule */ (current).name)
    ) {
      chain.unshift(
        /** @type import('postcss').AtRule */ (current).name +
          ' ' +
          /** @type import('postcss').AtRule */ (current).params
      );
    }
    current = current.parent;
  }

  return chain.join('|');
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-discard-overridden',
    prepare() {
      const cache = new Map();
      /** @type {{node: import('postcss').AtRule, scope: string}[]} */
      const rules = [];

      return {
        /**
         * @param {import('postcss').Root} css
         */
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

          for (const rule of rules) {
            if (cache.get(rule.scope) !== rule.node) {
              rule.node.remove();
            }
          }
        },
      };
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>} */ (
  pluginCreator
);

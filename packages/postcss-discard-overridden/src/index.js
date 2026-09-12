const OVERRIDABLE_RULES = new Set(['keyframes', 'counter-style']);
const SCOPE_RULES = new Set(['media', 'supports', 'container', 'layer']);
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
      const atRule = /** @type import('postcss').AtRule */ (current);
      chain.unshift(
        atRule.params
          ? atRule.name.toLowerCase() + ' ' + atRule.params
          : atRule.name.toLowerCase()
      );
    }
    current = current.parent;
  }

  return chain.join('|');
}

/**
 * Traverses container nodes from bottom to top so the winning at-rule
 * in any scope is visited first. Earlier duplicate scopes are removed.
 *
 * @param {import('postcss').Container<import('postcss').ChildNode> | import('postcss').Document} container
 * @param {Set<string>} seen
 * @return {void}
 */
function walkBackward(container, seen) {
  const { nodes } = container;

  if (!nodes) {
    return;
  }

  for (let i = nodes.length - 1; i >= 0; i--) {
    const child = nodes[i];

    if (child.type === 'atrule') {
      if (isOverridable(child.name)) {
        const scope = getScope(child);

        if (seen.has(scope)) {
          child.remove();
        } else {
          seen.add(scope);
        }
        continue;
      }
    }

    if (/** @type {import('postcss').Container} */ (child).nodes) {
      walkBackward(
        /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
          child
        ),
        seen
      );
    }
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-discard-overridden',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      const seen = new Set();
      walkBackward(css, seen);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

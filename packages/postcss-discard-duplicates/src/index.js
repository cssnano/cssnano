'use strict';
/**
 * Structural view over the postcss node kinds compared by `equals` and its
 * helpers.
 * @typedef {{
 *   type: string,
 *   important?: boolean,
 *   raws: { before?: string, afterName?: string },
 *   selector?: string,
 *   name?: string,
 *   params?: string,
 *   prop?: string,
 *   value?: string,
 *   nodes?: import('postcss').ChildNode[],
 * }} ComparableNode
 */

/**
 * @param {string | undefined} value
 * @return {string | undefined}
 */
function trimValue(value) {
  return value ? value.trim() : value;
}

/**
 * @param {{nodes: import('postcss').Node[]}} node
 * @return {boolean}
 */
function empty(node) {
  return !node.nodes.some((child) => child.type !== 'comment');
}

/**
 * @param {import('postcss').AnyNode} nodeA
 * @param {import('postcss').AnyNode} nodeB
 * @return {boolean}
 */
function equals(nodeA, nodeB) {
  const a = /** @type {ComparableNode} */ (nodeA);
  const b = /** @type {ComparableNode} */ (nodeB);
  if (a.type !== b.type) {
    return false;
  }

  if (a.important !== b.important) {
    return false;
  }

  if ((a.raws && !b.raws) || (!a.raws && b.raws)) {
    return false;
  }

  if (!equalsNodeProperties(a, b)) {
    return false;
  }

  return equalsChildren(a, b);
}

/**
 * @param {ComparableNode} a
 * @param {ComparableNode} b
 * @return {boolean}
 */
function equalsNodeProperties(a, b) {
  switch (a.type) {
    case 'rule':
      return a.selector === b.selector;
    case 'atrule':
      return equalsAtRule(a, b);
    case 'decl':
      return equalsDeclaration(a, b);
    default:
      return true;
  }
}

/**
 * @param {ComparableNode} a
 * @param {ComparableNode} b
 * @return {boolean}
 */
function equalsAtRule(a, b) {
  if (a.name !== b.name || a.params !== b.params) {
    return false;
  }

  if (a.raws && trimValue(a.raws.before) !== trimValue(b.raws.before)) {
    return false;
  }

  return !(
    a.raws && trimValue(a.raws.afterName) !== trimValue(b.raws.afterName)
  );
}

/**
 * @param {ComparableNode} a
 * @param {ComparableNode} b
 * @return {boolean}
 */
function equalsDeclaration(a, b) {
  if (a.prop !== b.prop || a.value !== b.value) {
    return false;
  }

  return !(a.raws && trimValue(a.raws.before) !== trimValue(b.raws.before));
}

/**
 * @param {ComparableNode} a
 * @param {ComparableNode} b
 * @return {boolean}
 */
function equalsChildren(a, b) {
  if (a.nodes && b.nodes) {
    if (a.nodes.length !== b.nodes.length) {
      return false;
    }

    for (let i = 0; i < a.nodes.length; i++) {
      if (!equals(a.nodes[i], b.nodes[i])) {
        return false;
      }
    }
  }
  return true;
}

/**
 * @param {import('postcss').Rule} last
 * @param {import('postcss').Rule[]} group rules sharing last's selector, in document order
 * @return {void}
 */
function dedupeRule(last, group) {
  for (let i = 0; i < group.length; i++) {
    const node = group[i];
    if (node === last) {
      break;
    }
    if (!node.parent) {
      continue;
    }
    last.each((child) => {
      if (child.type === 'decl') {
        dedupeNode(child, node.nodes);
      }
    });

    if (empty(node)) {
      node.remove();
    }
  }
}

/**
 * @param {import('postcss').AtRule | import('postcss').Declaration} last
 * @param {import('postcss').AnyNode[]} nodes
 * @return {void}
 */
function dedupeNode(last, nodes) {
  const found = nodes.indexOf(last);
  let index = found === -1 ? nodes.length - 1 : found - 1;

  while (index >= 0) {
    const node = nodes[index--];
    if (node && equals(node, last)) {
      node.remove();
    }
  }
}

/**
 * @param {import('postcss').AnyNode} root
 * @return {void}
 */
function dedupe(root) {
  const { nodes } =
    /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
      root
    );

  if (!nodes) {
    return;
  }

  // Group rules by selector so each only dedupes against same-selector rules.
  /** @type {Map<string, import('postcss').Rule[]> | undefined} */
  let ruleGroups;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.type === 'rule') {
      if (!ruleGroups) {
        ruleGroups = new Map();
      }
      const group = ruleGroups.get(node.selector);
      if (group) {
        group.push(node);
      } else {
        ruleGroups.set(node.selector, [node]);
      }
    }
  }

  let index = nodes.length - 1;
  while (index >= 0) {
    const last = nodes[index--];
    if (!last || !last.parent) {
      continue;
    }
    dedupe(last);
    if (last.type === 'rule') {
      const group = ruleGroups && ruleGroups.get(last.selector);
      if (group && group.length > 1) {
        dedupeRule(last, group);
      }
    } else if (
      (last.type === 'atrule' && last.name !== 'layer') ||
      last.type === 'decl'
    ) {
      dedupeNode(last, nodes);
    }
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-discard-duplicates',
    /**
     * @param {import('postcss').Root} css
     */
    OnceExit(css) {
      dedupe(css);
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>}*/ (
  pluginCreator
);

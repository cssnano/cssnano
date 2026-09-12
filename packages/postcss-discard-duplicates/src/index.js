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
 * @param {import('postcss').AnyNode | import('postcss').AnyNode[]} existing
 * @param {import('postcss').AnyNode} node
 * @return {boolean}
 */
function hasEqual(existing, node) {
  if (Array.isArray(existing)) {
    for (let i = 0; i < existing.length; i++) {
      if (equals(existing[i], node)) {
        return true;
      }
    }
    return false;
  }
  return equals(existing, node);
}

/**
 * @param {Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]>} map
 * @param {string} key
 * @param {import('postcss').AnyNode} node
 * @return {void}
 */
function addToSeen(map, key, node) {
  const existing = map.get(key);
  if (!existing) {
    map.set(key, node);
  } else if (Array.isArray(existing)) {
    existing.push(node);
  } else {
    map.set(key, [existing, node]);
  }
}

/**
 * @param {import('postcss').Rule} rule
 * @return {boolean}
 */
function hasNestedContainers(rule) {
  const { nodes } = rule;
  if (!nodes) {
    return false;
  }
  for (let i = 0; i < nodes.length; i++) {
    const type = nodes[i].type;
    if (type === 'rule' || type === 'atrule') {
      return true;
    }
  }
  return false;
}

/**
 * @param {import('postcss').Rule} rule
 * @param {Map<string, Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]>>} seenRuleDecls
 * @return {void}
 */
function dedupeRule(rule, seenRuleDecls) {
  let isSubsequent = true;
  let declMap = seenRuleDecls.get(rule.selector);
  if (!declMap) {
    isSubsequent = false;
    declMap = new Map();
    seenRuleDecls.set(rule.selector, declMap);
  }

  const { nodes } = rule;
  if (nodes) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const child = nodes[i];
      if (child.type === 'decl') {
        const existing = declMap.get(child.prop);
        if (existing && hasEqual(existing, child)) {
          child.remove();
        } else {
          addToSeen(declMap, child.prop, child);
        }
      }
    }
  }

  if (isSubsequent && empty(rule)) {
    rule.remove();
  }
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]>} seenDecls
 * @return {void}
 */
function dedupeDecl(decl, seenDecls) {
  const existing = seenDecls.get(decl.prop);
  if (existing && hasEqual(existing, decl)) {
    decl.remove();
  } else {
    addToSeen(seenDecls, decl.prop, decl);
  }
}

/**
 * @param {import('postcss').AtRule} atrule
 * @param {Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]>} seenAtRules
 * @return {void}
 */
function dedupeAtRule(atrule, seenAtRules) {
  if (atrule.nodes) {
    dedupe(atrule);
  }

  if (atrule.name === 'layer') {
    return;
  }

  const existing = seenAtRules.get(atrule.name);
  if (existing && hasEqual(existing, atrule)) {
    atrule.remove();
  } else {
    addToSeen(seenAtRules, atrule.name, atrule);
  }
}

/**
 * @param {import('postcss').AnyNode} container
 * @return {void}
 */
function dedupe(container) {
  const { nodes } =
    /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
      container
    );

  if (!nodes || nodes.length === 0) {
    return;
  }

  const children = nodes.slice();
  /** @type {Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]> | undefined} */
  let seenDecls;
  /** @type {Map<string, Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]>> | undefined} */
  let seenRuleDecls;
  /** @type {Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]> | undefined} */
  let seenAtRules;

  for (let i = children.length - 1; i >= 0; i--) {
    const node = children[i];
    if (!node.parent) {
      continue;
    }

    switch (node.type) {
      case 'decl':
        if (!seenDecls) {
          seenDecls = new Map();
        }
        dedupeDecl(node, seenDecls);
        break;
      case 'rule':
        if (!seenRuleDecls) {
          seenRuleDecls = new Map();
        }
        if (hasNestedContainers(node)) {
          dedupe(node);
        }
        dedupeRule(node, seenRuleDecls);
        break;
      case 'atrule':
        if (!seenAtRules) {
          seenAtRules = new Map();
        }
        dedupeAtRule(node, seenAtRules);
        break;
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
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

import cssnanoUtils from 'cssnano-utils';

const { isAnonymousLayer, isImportantComment } = cssnanoUtils;

// Identical preludes apply their contents under the same condition; other
// at-rules have semantics this plugin does not model.
const conditionalAtRules = new Set(['media', 'supports', 'container']);

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
 * @typedef {Map<string, import('postcss').AnyNode | import('postcss').AnyNode[]>} SeenNodes
 */

/**
 * Declarations already kept in a container, shared by every sibling at-rule
 * whose conditions are identical.
 * @typedef {{
 *   decls?: SeenNodes,
 *   ruleDecls?: Map<string, SeenNodes>,
 *   children?: Map<string, Scope>,
 * }} Scope
 */

/**
 * @param {Scope} scope
 * @param {string} key
 * @return {Scope}
 */
function childScope(scope, key) {
  const children = (scope.children ??= new Map());
  let child = children.get(key);
  if (!child) {
    child = {};
    children.set(key, child);
  }
  return child;
}

/**
 * @param {string | undefined} value
 * @return {string | undefined}
 */
function trimValue(value) {
  return value ? value.trim() : value;
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
 * @param {Map<string, SeenNodes>} seenRuleDecls
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

  let hasContainers = false;

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
      } else if (child.type === 'rule' || child.type === 'atrule') {
        hasContainers = true;
      }
    }
  }

  if (isSubsequent && !hasContent(rule)) {
    rule.remove();
  } else if (hasContainers) {
    dedupe(rule);
  }
}

/**
 * @param {import('postcss').Declaration} decl
 * @param {SeenNodes} seenDecls
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
 * Comments starting with `/*!` are preserved by minifiers, so a container
 * that holds one is not discarded with its emptied contents.
 * @param {import('postcss').Rule | import('postcss').AtRule} container
 * @return {boolean} whether the block holds anything but ordinary comments
 */
function hasContent(container) {
  return Boolean(
    container.nodes?.some(
      (node) => node.type !== 'comment' || isImportantComment(node.text)
    )
  );
}

/**
 * The first appearance of a named layer fixes its place in the layer order,
 * so a block declaring one cannot be dropped in favor of a later copy.
 * @param {import('postcss').AtRule} atrule
 * @return {boolean}
 */
function declaresLayer(atrule) {
  let found = false;
  atrule.walkAtRules(/^layer$/iv, () => {
    found = true;
    return false;
  });
  return found;
}

/**
 * @param {import('postcss').AtRule} atrule
 * @param {SeenNodes} seenAtRules
 * @param {Scope} scope
 * @return {void}
 */
function dedupeAtRule(atrule, seenAtRules, scope) {
  const name = atrule.name.toLowerCase();
  // Blocks of one named layer form a single layer; anonymous ones are distinct.
  if (name === 'layer') {
    if (atrule.nodes) {
      dedupe(
        atrule,
        isAnonymousLayer(atrule)
          ? undefined
          : childScope(scope, `layer\0${atrule.params}`)
      );
    }
    return;
  }

  if (atrule.nodes) {
    if (conditionalAtRules.has(name)) {
      // An emptied conditional group has no effect.
      const hadContent = hasContent(atrule);
      dedupe(atrule, childScope(scope, `${name}\0${atrule.params}`));
      if (hadContent && !hasContent(atrule)) {
        atrule.remove();
        return;
      }
    } else {
      dedupe(atrule);
    }
  }

  // An imported style sheet may declare layers, so even an identical earlier
  // @import can fix a layer's place in the layer order.
  if (name === 'import') {
    return;
  }

  const existing = seenAtRules.get(name);
  if (existing && hasEqual(existing, atrule) && !declaresLayer(atrule)) {
    atrule.remove();
  } else {
    addToSeen(seenAtRules, name, atrule);
  }
}

/**
 * @param {import('postcss').AnyNode} container
 * @param {Scope} [scope]
 * @return {void}
 */
function dedupe(container, scope = {}) {
  const { nodes } =
    /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
      container
    );

  if (!nodes || nodes.length === 0) {
    return;
  }

  const children = nodes.slice();
  /** @type {SeenNodes | undefined} */
  let seenAtRules;

  for (let i = children.length - 1; i >= 0; i--) {
    const node = children[i];
    if (!node.parent) {
      continue;
    }

    switch (node.type) {
      case 'decl':
        dedupeDecl(node, (scope.decls ??= new Map()));
        break;
      case 'rule':
        dedupeRule(node, (scope.ruleDecls ??= new Map()));
        break;
      case 'atrule':
        dedupeAtRule(node, (seenAtRules ??= new Map()), scope);
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

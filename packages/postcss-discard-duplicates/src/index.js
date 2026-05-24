'use strict';
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
  const nodes = node.nodes;
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].type !== 'comment') {
      return false;
    }
  }
  return true;
}

/**
 * @param {import('postcss').AnyNode} nodeA
 * @param {import('postcss').AnyNode} nodeB
 * @return {boolean}
 */
function equals(nodeA, nodeB) {
  const a = /** @type {any} */ (nodeA);
  const b = /** @type {any} */ (nodeB);
  if (a.type !== b.type) {
    return false;
  }

  if (a.important !== b.important) {
    return false;
  }

  if ((a.raws && !b.raws) || (!a.raws && b.raws)) {
    return false;
  }

  switch (a.type) {
    case 'rule':
      if (a.selector !== b.selector) {
        return false;
      }
      break;
    case 'atrule':
      if (a.name !== b.name || a.params !== b.params) {
        return false;
      }

      if (a.raws && trimValue(a.raws.before) !== trimValue(b.raws.before)) {
        return false;
      }

      if (
        a.raws &&
        trimValue(a.raws.afterName) !== trimValue(b.raws.afterName)
      ) {
        return false;
      }
      break;
    case 'decl':
      if (a.prop !== b.prop || a.value !== b.value) {
        return false;
      }

      if (a.raws && trimValue(a.raws.before) !== trimValue(b.raws.before)) {
        return false;
      }
      break;
  }

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
 * @param {import('postcss').AnyNode} node
 * @param {import('postcss').AnyNode[]} targetNodes
 * @return {void}
 */
function dedupeFrom(node, targetNodes) {
  for (let i = targetNodes.length - 1; i >= 0; i--) {
    const n = targetNodes[i];
    if (n && equals(n, node)) {
      n.remove();
    }
  }
}

/**
 * @param {import('postcss').AnyNode} container
 * @return {void}
 */
function dedupe(container) {
  const nodes =
    /** @type {import('postcss').Container<import('postcss').ChildNode>} */ (
      container
    ).nodes;

  if (!nodes) {
    return;
  }

  /** @type {Map<string, import('postcss').Rule[]> | null} */
  let ruleGroups = null;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.type === 'rule') {
      if (!ruleGroups) {
        ruleGroups = new Map();
      }
      const arr = ruleGroups.get(n.selector);
      if (arr) {
        arr.push(n);
      } else {
        ruleGroups.set(n.selector, [n]);
      }
    }
  }

  // Recurse-then-dispatch order preserves atrule equals() semantics: an earlier
  // atrule must still see its (un-recursed) interior when compared at this level.
  let index = nodes.length - 1;
  while (index >= 0) {
    const last = nodes[index--];
    if (!last || !last.parent) {
      continue;
    }
    if (last.type === 'rule' || last.type === 'atrule') {
      dedupe(last);
    }

    if (last.type === 'rule') {
      const group = ruleGroups && ruleGroups.get(last.selector);
      if (group && group.length > 1) {
        const lastDecls = last.nodes;
        for (let g = 0; g < group.length; g++) {
          const earlier = group[g];
          if (earlier === last) {
            break;
          }
          if (!earlier.parent) {
            continue;
          }
          const earlierNodes = earlier.nodes;
          for (let d = 0; d < lastDecls.length; d++) {
            const child = lastDecls[d];
            if (child.type === 'decl') {
              dedupeFrom(child, earlierNodes);
            }
          }
          if (empty(earlier)) {
            earlier.remove();
          }
        }
      }
    } else if (
      (last.type === 'atrule' && last.name !== 'layer') ||
      last.type === 'decl'
    ) {
      const cur = nodes.indexOf(last);
      for (let i = cur - 1; i >= 0; i--) {
        const n = nodes[i];
        if (n && equals(n, last)) {
          n.remove();
        }
      }
    }
  }
}

/**
 * @type {import('postcss').PluginCreator<void>}
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: 'postcss-discard-duplicates',
    OnceExit(css) {
      dedupe(css);
    },
  };
}

pluginCreator.postcss = true;
module.exports = pluginCreator;

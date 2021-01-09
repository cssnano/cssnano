import { plugin } from 'postcss';

function noop() {}

function trimValue(value) {
  return value ? value.trim() : value;
}

function empty(node) {
  return !node.nodes.filter((child) => child.type !== 'comment').length;
}

function equals(a, b) {
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

  if (a.nodes) {
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

function dedupeRule(last, nodes) {
  let index = nodes.indexOf(last) - 1;
  while (index >= 0) {
    const node = nodes[index--];
    if (node && node.type === 'rule' && node.selector === last.selector) {
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
}

function dedupeNode(last, nodes, keepFirst) {
  let index = ~nodes.indexOf(last) ? nodes.indexOf(last) - 1 : nodes.length - 1;

  while (index >= 0) {
    const node = nodes[index--];
    if (node && equals(node, last)) {
      if (keepFirst) {
        last.remove();
      } else {
        node.remove();
      }
    }
  }
}

const handlers = {
  rule: dedupeRule,
  atrule: dedupeNode,
  decl: dedupeNode,
  comment: noop,
};

function dedupe(root, opts) {
  const { nodes } = root;
  const { keepFirst } = opts;

  if (!nodes) {
    return;
  }

  let index = nodes.length - 1;
  while (index >= 0) {
    let last = nodes[index--];
    if (!last || !last.parent) {
      continue;
    }
    dedupe(last, opts);
    handlers[last.type](last, nodes, keepFirst);
  }
}

export default plugin('postcss-discard-duplicates', (opts = {}) => (root) => dedupe(root, opts));

import { plugin } from 'postcss';
import * as R from 'ramda';
import equals from './equals';
import equalSelectors from './equalSelectors';
import isCommentNode from './isCommentNode';
import isDeclNode from './isDeclNode';
import isRuleNode from './isRuleNode';

function noop() {}

const empty = R.compose(
  R.complement(R.length),
  R.reject(isCommentNode),
  R.prop('nodes')
);

function dedupeRule(last, nodes) {
  let index = nodes.indexOf(last) - 1;
  while (index >= 0) {
    const node = nodes[index--];
    if (R.both(isRuleNode, equalSelectors(last))(node)) {
      last.each((child) => {
        if (isDeclNode(child)) {
          dedupeNode(child, node.nodes);
        }
      });

      if (empty(node)) {
        node.remove();
      }
    }
  }
}

function dedupeNode(last, nodes) {
  let index = ~nodes.indexOf(last) ? nodes.indexOf(last) - 1 : nodes.length - 1;

  while (index >= 0) {
    const node = nodes[index--];
    if (node && equals(node, last)) {
      node.remove();
    }
  }
}

const handlers = {
  rule: dedupeRule,
  atrule: dedupeNode,
  decl: dedupeNode,
  comment: noop,
};

function dedupe(root) {
  const { nodes } = root;

  if (!nodes) {
    return;
  }

  let index = nodes.length - 1;
  while (index >= 0) {
    let last = nodes[index--];
    if (!last || !last.parent) {
      continue;
    }
    dedupe(last);
    handlers[last.type](last, nodes);
  }
}

export default plugin('postcss-discard-duplicates', () => dedupe);

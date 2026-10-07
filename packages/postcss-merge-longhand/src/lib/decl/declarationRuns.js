/**
 * A nested rule or at-rule ends a run of declarations: declarations after it
 * cascade after its own, so a shorthand merged across it would override them.
 * An empty style rule declares nothing and does not end a run.
 *
 * @param {import('postcss').ChildNode} node
 * @return {boolean}
 */
export function endsDeclarationRun(node) {
  if (node.type === 'atrule') return true;
  return node.type === 'rule' && node.nodes.length > 0;
}

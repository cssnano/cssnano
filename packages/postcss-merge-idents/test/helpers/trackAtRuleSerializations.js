/**
 * Monkey-patches at-rule children to count serialization calls across a container.
 *
 * @param {import('postcss').Root} root
 * @return {() => number}
 */
export function trackAtRuleSerializations(root) {
  let calls = 0;
  for (const node of root.nodes) {
    if (node.type === 'atrule' && node.nodes) {
      const origToString = node.nodes.toString;
      node.nodes.toString = function (...args) {
        calls++;
        return origToString.apply(this, args);
      };
    }
  }
  return () => calls;
}

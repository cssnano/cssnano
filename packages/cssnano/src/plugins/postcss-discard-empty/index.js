import cssnanoUtils from '#utils';
import { runRecordsPlugin } from '../../passes/ir/recordsPlugin.js';
import { discardEmptyRecords } from '../../passes/ir/discardRecords.js';

const { asciiLowerCase } = cssnanoUtils;

const plugin = 'postcss-discard-empty';

/**
 * @param {import('postcss').AnyNode} node
 * @param {import('postcss').Container['nodes']} sub
 * @param {boolean} isLayer
 * @param {boolean} isRedundantLayer
 * @return {boolean}
 */
function shouldDiscard(node, sub, isLayer, isRedundantLayer) {
  const { type } = node;

  return Boolean(
    (type === 'decl' && !node.value && !node.prop.startsWith('--')) ||
    (type === 'rule' && !node.selector) ||
    (sub && !sub.length && !isLayer) ||
    isRedundantLayer ||
    (type === 'atrule' &&
      ((!sub && !node.params) ||
        (!node.params &&
          !(/** @type {import('postcss').ChildNode[]} */ (sub).length))))
  );
}

/**
 * @param {import('postcss').Result} result
 * @param {import('postcss').AnyNode} node
 * @return {void}
 */
function reportRemoval(result, node) {
  result.messages.push({ type: 'removal', plugin, node });
}

/**
 * Removes a node that a transform after the walk no longer needs, then each
 * ancestor the removal empties, so no parent the walk passed stays empty. An
 * emptied named `@layer` stays: it may fix the order of its layer.
 *
 * @param {import('postcss').ChildNode} node
 * @param {import('postcss').Result} result
 * @return {void}
 */
export function removeAndDiscardEmptied(node, result) {
  /** @typedef {import('postcss').AnyNode | import('postcss').Document | undefined} Parent */
  let parent = /** @type {Parent} */ (node.parent);
  node.remove();
  while (
    (parent?.type === 'rule' || parent?.type === 'atrule') &&
    shouldDiscard(
      parent,
      parent.nodes,
      parent.type === 'atrule' && asciiLowerCase(parent.name) === 'layer',
      false
    )
  ) {
    const next = /** @type {Parent} */ (parent.parent);
    parent.remove();
    reportRemoval(result, parent);
    parent = next;
  }
}

/**
 * @return {import('postcss').Plugin}
 */
function pluginCreator() {
  return {
    postcssPlugin: plugin,
    /**
     * @param {import('postcss').Root} css
     * @param {import('postcss').Helpers} helpers
     */
    OnceExit(css, { result }) {
      runRecordsPlugin(css, result, [
        (records, browsers, context) => {
          discardEmptyRecords(records, context);
        },
      ]);
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

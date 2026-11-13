import cssnanoUtils from '#utils';
import { TextTable } from '../../values/textTable.js';
import {
  joinKey,
  parseLayerNames,
  SEPARATOR,
} from '../../values/layerNames.js';

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
 * An empty `@layer x{}` is redundant only when an earlier block or statement
 * already fixed the order of `x`. Every ancestor other than `@layer` is
 * treated as a condition, so an earlier declaration counts only at top level
 * or under a condition that also encloses the later block. `visit` runs on
 * each node that is kept, after its children, so another per-node transform
 * can share this walk.
 *
 * @param {import('postcss').Root} css
 * @param {import('postcss').Result} result
 * @param {((node: import('postcss').AnyNode) => void) | undefined} visit
 * @param {import('../../values/textTable.js').TextTable} table the text table
 *   the walk stored, which gives each layer's names
 * @return {void}
 */
export function discardAndReport(css, result, visit, table) {
  /** Layer keys declared in each open condition, outermost (top level) first.
   * Sets are created on first use; most conditions declare no layer.
   * @type {(Set<string> | undefined)[]} */
  const scopes = [undefined];
  let unnamedLayers = 0;

  /** @param {string} layerKey */
  const isDeclared = (layerKey) => scopes.some((scope) => scope?.has(layerKey));

  /**
   * Naming `a.b` also creates its parent `a` (CSS Cascade 5), so every
   * prefix of the path becomes declared.
   *
   * @param {string} parentKey
   * @param {string} name
   */
  const declare = (parentKey, name) => {
    let key = parentKey;
    for (const segment of name.split(SEPARATOR)) {
      key = joinKey(key, segment);
      (scopes[scopes.length - 1] ??= new Set()).add(key);
    }
  };

  /**
   * Layers are transparent to conditions; any other container opens one.
   *
   * @param {import('postcss').Container} container
   * @param {boolean} isLayer
   * @param {string} layerKey
   * @return {void}
   */
  function walkChildren(container, isLayer, layerKey) {
    if (!isLayer) {
      scopes.push(undefined);
    }
    container.each((child) => discardEmpty(child, layerKey));
    if (!isLayer) {
      scopes.pop();
    }
  }

  /**
   * @param {import('postcss').AnyNode} node
   * @param {string} parentKey key of the enclosing layer, '' outside layers
   * @return {void}
   */
  function discardEmpty(node, parentKey = '') {
    const { type } = node;
    /** @type {import('postcss').ChildNode[] | undefined} */
    const sub = /** @type {import('postcss').Container} */ (node).nodes;
    const isLayer = type === 'atrule' && asciiLowerCase(node.name) === 'layer';
    const names = isLayer
      ? parseLayerNames(
          table.tokens(/** @type {import('postcss').AtRule} */ (node))
        )
      : undefined;
    // A block takes one name; an unnamed or invalid block gets a segment
    // no other layer can share.
    const name = sub && names?.length === 1 ? names[0] : undefined;
    let layerKey = parentKey;

    if (isLayer && sub) {
      layerKey = joinKey(parentKey, name ?? `${SEPARATOR}${unnamedLayers++}`);
    } else if (names) {
      // `@layer a, b.c;` fixes the order of each listed layer.
      for (const listed of names) {
        declare(parentKey, listed);
      }
    }

    if (sub) {
      walkChildren(
        /** @type {import('postcss').Container} */ (node),
        isLayer,
        layerKey
      );
    }

    const isRedundantLayer =
      name !== undefined && sub?.length === 0 && isDeclared(layerKey);

    if (shouldDiscard(node, sub, isLayer, isRedundantLayer)) {
      node.remove();
      reportRemoval(result, node);
    } else {
      if (name !== undefined) declare(parentKey, name);
      if (visit) visit(node);
    }
  }

  css.each((node) => discardEmpty(node));
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
      discardAndReport(css, result, undefined, new TextTable());
    },
  };
}
/** @type {true} */
pluginCreator.postcss = true;
const moduleExports = pluginCreator;

export { moduleExports as default, moduleExports as 'module.exports' };

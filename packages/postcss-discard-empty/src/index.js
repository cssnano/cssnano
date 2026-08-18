'use strict';
const plugin = 'postcss-discard-empty';

/**
 * @param {string} layerName
 * @return {string[]}
 */
function getLayerPath(layerName) {
  const layerPath = [];
  let component = '';
  let escaped = false;

  for (const character of layerName) {
    if (character === '\\' && !escaped) {
      escaped = true;
      component += character;
    } else if (character === '.' && !escaped) {
      layerPath.push(component.trim());
      component = '';
    } else {
      component += character;
      escaped = false;
    }
  }

  layerPath.push(component.trim());
  return layerPath;
}

/**
 * @param {import('postcss').AnyNode} node
 * @param {import('postcss').Container['nodes']} sub
 * @param {boolean} isLayer
 * @param {boolean} isEmptyLayer
 * @param {string} layerKey
 * @param {Set<string>} nonEmptyLayers
 * @return {boolean}
 */
function shouldDiscard(
  node,
  sub,
  isLayer,
  isEmptyLayer,
  layerKey,
  nonEmptyLayers
) {
  const { type } = node;

  return Boolean(
    (type === 'decl' && !node.value && !node.prop.startsWith('--')) ||
    (type === 'rule' && !node.selector) ||
    (sub && !sub.length && !isLayer) ||
    (isEmptyLayer && nonEmptyLayers.has(layerKey)) ||
    (type === 'atrule' &&
      ((!sub && !node.params) ||
        (!node.params &&
          !(/** @type {import('postcss').ChildNode[]} */ (sub).length))))
  );
}

/**
 * @param {import('postcss').Root} css
 * @param {import('postcss').Result} result
 * @return {void}
 */
function discardAndReport(css, result) {
  const nonEmptyLayers = new Set();

  /**
   * @param {import('postcss').AnyNode} node
   * @param {string[]} [layerPath=[]]
   * @return {void}
   */
  function discardEmpty(node, layerPath = []) {
    const { type } = node;
    /** @type {import('postcss').ChildNode[] | undefined} */
    const sub = /** @type {import('postcss').Container} */ (node).nodes;
    const isLayer = type === 'atrule' && node.name === 'layer';
    const layerName = isLayer ? node.params.trim() : '';
    const currentLayerPath = layerName
      ? [...layerPath, ...getLayerPath(layerName)]
      : layerPath;
    if (sub) {
      /** @type {import('postcss').Container} */ (node).each((child) =>
        discardEmpty(child, currentLayerPath)
      );
    }

    const isEmptyLayer = Boolean(isLayer && layerName && sub && !sub.length);
    const layerKey = currentLayerPath.join('\0');

    if (
      shouldDiscard(node, sub, isLayer, isEmptyLayer, layerKey, nonEmptyLayers)
    ) {
      node.remove();

      result.messages.push({
        type: 'removal',
        plugin,
        node,
      });
    } else if (isLayer && sub && sub.length) {
      nonEmptyLayers.add(layerKey);
    }
  }

  css.each((node) => discardEmpty(node));
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
      discardAndReport(css, result);
    },
  };
}

pluginCreator.postcss = true;
module.exports = /** @type {import('postcss').PluginCreator<void>}*/ (
  pluginCreator
);

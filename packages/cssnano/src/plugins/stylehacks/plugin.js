import { browsersAffectedBy } from '#utils/browser-bugs';

/** @import {BugKey} from '#utils/browser-bugs' */

/**
 * @typedef {import('postcss').Node & {
 *   _stylehacks: {
 *     message: string,
 *     browsers: readonly string[],
 *     identifier: string,
 *     hack: string
 *   }
 * }} NodeWithInfo
 */

export default (class BasePlugin {
  /**
   * @typedef {object} Plugin
   * @prop {Set<string>} nodeTypes
   * @prop {(node: import('postcss').Node) => void} detectAndResolve
   * @prop {(node: import('postcss').Node) => void} detectAndWarn
   */
  /**
   * @param {BugKey} bug A browser bug key from utils/data/bugs.json.
   * @param {string[]} nodeTypes
   * @param {import('postcss').Result=} result
   */
  constructor(bug, nodeTypes, result) {
    /** @type {NodeWithInfo[]} */
    this.nodes = [];
    this.nodeTypes = new Set(nodeTypes);
    this.bug = bug;
    this.result = result;
    // Every matched node shares the bug's frozen browser list.
    this.browsers = browsersAffectedBy(bug);
  }

  /**
   * @param {import('postcss').Node} node
   * @param {{identifier: string, hack: string}} metadata
   * @return {void}
   */
  push(node, metadata) {
    /** @type {NodeWithInfo} */ (node)._stylehacks = {
      ...metadata,
      message: `Bad ${metadata.identifier}: ${metadata.hack}`,
      browsers: this.browsers,
    };

    this.nodes.push(/** @type {NodeWithInfo} */ (node));
  }

  /**
   * @param {import('postcss').Node} node
   * @return {boolean}
   */
  any(node) {
    if (this.nodeTypes.has(node.type)) {
      this.detect(node);

      return /** @type {NodeWithInfo} */ (node)._stylehacks !== undefined;
    }

    return false;
  }

  /**
   * @param {import('postcss').Node} node
   * @return {void}
   */
  detectAndResolve(node) {
    this.nodes = [];

    this.detect(node);

    return this.resolve();
  }

  /**
   * @param {import('postcss').Node} node
   * @return {void}
   */
  detectAndWarn(node) {
    this.nodes = [];

    this.detect(node);

    return this.warn();
  }
  /** @param {import('postcss').Node} node */
  // eslint-disable-next-line no-unused-vars
  detect(node) {
    throw new Error('You need to implement this method in a subclass.');
  }

  /** @return {void} */
  resolve() {
    for (const node of this.nodes) {
      node.remove();
    }
  }

  warn() {
    for (const node of this.nodes) {
      const { message, browsers, identifier, hack } = node._stylehacks;

      node.warn(
        /** @type {import('postcss').Result} */ (this.result),
        message + JSON.stringify({ browsers, identifier, hack })
      );
    }
  }
});

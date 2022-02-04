'use strict';
module.exports = class BasePlugin {
  constructor(targets, nodeTypes, result) {
    this.nodes = [];
    this.targets = new Set(targets);
    this.nodeTypes = new Set(nodeTypes);
    this.result = result;
  }

  push(node, metadata) {
    node._stylehacks = Object.assign({}, metadata, {
      message: `Bad ${metadata.identifier}: ${metadata.hack}`,
      browsers: this.targets,
    });

    this.nodes.push(node);
  }

  any(node) {
    if (this.nodeTypes.has(node.type)) {
      this.detect(node);

      return !!node._stylehacks;
    }

    return false;
  }

  detectAndResolve(node) {
    this.nodes = [];

    this.detect(node);

    return this.resolve();
  }

  detectAndWarn(node) {
    this.nodes = [];

    this.detect(node);

    return this.warn();
  }
  // eslint-disable-next-line no-unused-vars
  detect(node) {
    throw new Error('You need to implement this method in a subclass.');
  }

  resolve() {
    return this.nodes.forEach((node) => node.remove());
  }

  warn() {
    return this.nodes.forEach((node) => {
      const { message, browsers, identifier, hack } = node._stylehacks;

      return node.warn(this.result, message, { browsers, identifier, hack });
    });
  }
};

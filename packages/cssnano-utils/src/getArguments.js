'use strict';
module.exports = function getArguments(node) {
  const list = [[]];
  for (const child of node.nodes) {
    if (child.type !== 'div') {
      list[list.length - 1].push(child);
    } else {
      list.push([]);
    }
  }
  return list;
};

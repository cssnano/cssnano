'use strict';
const getLastNode = require('./getLastNode');

module.exports = function getRules(props, properties) {
  return properties
    .map((property) => {
      return getLastNode(props, property);
    })
    .filter(Boolean);
};

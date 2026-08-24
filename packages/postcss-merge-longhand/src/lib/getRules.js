import getLastNode from './getLastNode.js';

/**
 * @param {Iterable<import('postcss').Declaration>} props
 * @param {string[]} properties
 * @return {import('postcss').Declaration[]}
 */
function getRules(props, properties) {
  return properties
    .map((property) => {
      return getLastNode(props, property);
    })
    .filter(Boolean);
}

export default getRules;

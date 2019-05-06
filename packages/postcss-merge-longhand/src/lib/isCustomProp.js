export default (node) => ~node.value.search(/(var|env)\(/i);

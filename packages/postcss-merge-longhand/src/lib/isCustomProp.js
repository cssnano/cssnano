export default (node) => ~node.value.search(/(var|constant|env)\s*\(/i);

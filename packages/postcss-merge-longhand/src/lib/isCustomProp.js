const customPropRegex = /var\s*\(\s*--/iv;
/** @param {import('postcss').Declaration} node */
export default (node) => node.value.search(customPropRegex) !== -1;

const customPropRegex = /var\s*\(\s*--/i;
/** @param {import('postcss').Declaration} node */
export default (node) => node.value.search(customPropRegex) !== -1;

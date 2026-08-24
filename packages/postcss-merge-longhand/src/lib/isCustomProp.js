const customPropRegex = /var\s*\(\s*--/i;
export default (node) => node.value.search(customPropRegex) !== -1;

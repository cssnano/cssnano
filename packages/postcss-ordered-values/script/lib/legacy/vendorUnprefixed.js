const vendorPrefixRegex = /^-\w+-/;
export default (property) => property.replace(vendorPrefixRegex, '');

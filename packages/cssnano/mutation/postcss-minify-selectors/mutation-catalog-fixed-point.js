export const name = 'postcss-minify-selectors: fixed-point pseudo-class names';
export const target = new URL(
  '../../src/plugins/postcss-minify-selectors/lib/fixedPointSelector.js',
  import.meta.url
).href;
export const test = new URL(
  '../../test/postcss-minify-selectors/fixedPoint.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'accept a second colon, so a pseudo-element passes',
    find: '      if (!isPseudoNameStartCode(source.charCodeAt(index))) return false;',
    replace:
      "      if (source[index] !== ':' && !isPseudoNameStartCode(source.charCodeAt(index))) return false;",
  },
  {
    name: 'accept uppercase letters in a pseudo-class name',
    find: '    (code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45',
    replace:
      '    (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 45',
  },
  {
    name: 'accept a functional pseudo-class by ending the scan at its parenthesis',
    find: "      if (source[index] === '(') return false;",
    replace: "      if (source[index] === '(') index = source.length;",
  },
  {
    name: 'accept a leading hyphen, so vendor-prefixed pseudo-classes pass',
    find: '  return code >= 97 && code <= 122;',
    replace: '  return code === 45 || (code >= 97 && code <= 122);',
  },
  {
    name: 'accept a digit as the first character of a pseudo-class name',
    find: '  return code >= 97 && code <= 122;',
    replace:
      '  return (code >= 48 && code <= 57) || (code >= 97 && code <= 122);',
  },
  {
    name: 'reject a pseudo-class name with a hyphen',
    find: '    (code >= 48 && code <= 57) || (code >= 97 && code <= 122) || code === 45',
    replace: '    (code >= 48 && code <= 57) || (code >= 97 && code <= 122)',
  },
];

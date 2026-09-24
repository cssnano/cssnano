export const name = 'postcss-merge-longhand: validity gates';
export const target = new URL('./src/lib/validateWsc.js', import.meta.url).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL('./test/*.js', import.meta.url).href;

export const mutations = [
  {
    name: 'accept a border value that specifies a component twice',
    find: '    if (specified.has(component)) {',
    replace: '    if (false) {',
  },
  {
    name: 'accept tokens that are no border component',
    find: '      if (!isSubstitution(token)) {',
    replace: '      if (false) {',
  },
  {
    name: 'accept multi-token values for a single-component border property',
    find: '  if (parts.length !== 1) {',
    replace: '  if (false) {',
  },
  {
    name: 'accept negative border widths',
    find: "  if (number.startsWith('-')) {",
    replace: '  if (false) {',
  },
  {
    name: 'accept unitless non-zero border widths',
    find: '    return Number(number) === 0;',
    replace: '    return true;',
  },
  {
    name: 'accept border widths with unrecognized units',
    find: '  return lengthUnits.has(unit);',
    replace: '  return true;',
  },
];

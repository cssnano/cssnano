export const name = 'postcss-merge-longhand: validity gates';
export const target = new URL(
  '../../src/plugins/postcss-merge-longhand/lib/validateWsc.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/postcss-merge-longhand/*.js',
  import.meta.url
).href;

const parseWsc = new URL(
  '../../src/plugins/postcss-merge-longhand/lib/parseWsc.js',
  import.meta.url
).href;
const lengthGrammar = new URL(
  '../../src/plugins/postcss-merge-longhand/lib/lengthGrammar.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'accept a border value that specifies a component twice',
    target: parseWsc,
    find: 'if (width !== undefined) return null;',
    replace: 'if (false) return null;',
  },
  {
    name: 'accept tokens that are no border component',
    target: parseWsc,
    find: '    } else {\n      return null;\n    }\n  }\n\n  if (tokens > 3)',
    replace: '    }\n  }\n\n  if (tokens > 3)',
  },
  {
    name: 'accept multi-token values for a single-component border property',
    find: '  if (parts.length !== 1) {',
    replace: '  if (false) {',
  },
  {
    name: 'accept negative border widths',
    target: lengthGrammar,
    find: '(number < 0 || Object.is(number, -0))',
    replace: 'Object.is(number, -0)',
  },
  {
    name: 'accept negative zero border widths',
    target: lengthGrammar,
    find: '(number < 0 || Object.is(number, -0))',
    replace: 'number < 0',
  },
  {
    name: 'accept unitless non-zero border widths',
    target: lengthGrammar,
    find: "if (unit === '') return number === 0;",
    replace: "if (unit === '') return true;",
  },
  {
    name: 'accept border widths with unrecognized units',
    target: lengthGrammar,
    find: 'return lengthUnits.has(asciiLowerCase(unit));',
    replace: 'return true;',
  },
];

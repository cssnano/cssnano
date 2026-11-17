export const name = 'postcss-normalize-whitespace';
export const target = new URL(
  '../../src/plugins/postcss-normalize-whitespace/index.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/postcss-normalize-whitespace/{at-rules,comments,custom-properties,escapes,functions,grid-template-areas,math-functions,raws-metadata,urls,variable-boundaries,variable-fallbacks,variable-functions}.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'preserve declaration whitespace',
    target: new URL(
      '../../src/plugins/postcss-normalize-whitespace/lib/normalizeRaws.js',
      import.meta.url
    ).href,
    find: "const before = record.before.replaceAll(whitespaceRegex, '');",
    replace: 'const before = record.before;',
  },
  {
    name: 'trim custom properties as standard declarations',
    target: new URL(
      '../../src/plugins/postcss-normalize-whitespace/lib/normalizeRaws.js',
      import.meta.url
    ).href,
    find: "if (!record.prop.startsWith('--')) {",
    replace: "if (record.prop.startsWith('--')) {",
  },
  {
    name: 'skip declaration trimming',
    target: new URL(
      '../../src/plugins/postcss-normalize-whitespace/lib/normalizeRaws.js',
      import.meta.url
    ).href,
    find: 'normalizeDeclaration(records, tokenLists, index);',
    replace: 'void index;',
  },
  {
    name: 'preserve spaces around dividers',
    find: '  const besideSlash = !context?.math && (isSlash(previous) || isSlash(next));',
    replace: '  const besideSlash = false;',
  },
  {
    name: 'drop preserved comments from the declaration separator',
    target: new URL(
      '../../src/plugins/postcss-normalize-whitespace/lib/normalizeRaws.js',
      import.meta.url
    ).href,
    find: 'trimSeparator(between),',
    replace: "':',",
  },
  {
    name: 'keep custom property separator whitespace',
    target: new URL(
      '../../src/plugins/postcss-normalize-whitespace/lib/normalizeRaws.js',
      import.meta.url
    ).href,
    find: 'trimCustomPropertySeparator(between),',
    replace: 'between,',
  },
  {
    name: 'drop trailing escape repair',
    target: new URL('../../src/run/whitespaceRaws.js', import.meta.url).href,
    find: 'text + after[0]',
    replace: 'text',
  },
];

export const name = 'postcss-unique-selectors: selector writer';
export const target = new URL(
  '../../src/plugins/postcss-unique-selectors/index.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/pipeline/textTableWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'assign a deduplicated selector list as text, dropping its tokens',
    find: '  table.write(rule, uniqueSelectorsTokens(list, unique));',
    replace: '  table.setText(rule, uniqueSelectorsText(selectors, unique));',
  },
];

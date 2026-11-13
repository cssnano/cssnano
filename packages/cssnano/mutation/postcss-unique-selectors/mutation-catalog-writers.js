export const name = 'postcss-unique-selectors: selector writer';
export const target = new URL(
  '../../src/plugins/postcss-unique-selectors/index.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/passes/ir/uniqueSelectors.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'assign a deduplicated selector list as text, dropping its tokens',
    target: new URL('../../src/passes/ir/uniqueSelectors.js', import.meta.url)
      .href,
    find: 'context.selectorIds.idOf(tokenLists, tokensText(tokens), tokens)',
    replace: 'context.selectorIds.idOf(tokenLists, tokensText(tokens), [])',
  },
];

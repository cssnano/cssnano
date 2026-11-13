export const name = 'pipeline-writers: host walk values';
export const target = new URL(
  '../../src/pipeline/declarationWalk.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../test/pipeline/walkWriters.test.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'tokenize a declaration comment-free value in the default mode',
    find: 'run.valueIds.idOf(run.tokenLists, tokenizeMode(prop), cleaned)',
    replace: 'run.valueIds.idOf(run.tokenLists, undefined, cleaned)',
  },
];

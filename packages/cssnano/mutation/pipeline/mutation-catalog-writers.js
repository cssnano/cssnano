export const name = 'pipeline-writers: selector walk';
export const target = new URL(
  '../../src/pipeline/selectorReduce.js',
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
    name: 'assign a changed selector as a string, dropping its tokens',
    find: '  } else if (tokens !== undefined) table.write(rule, tokens);',
    replace: '  } else if (tokens !== undefined) table.setText(rule, result);',
  },
  {
    name: 'assign an unchanged selector as a string, dropping its tokens',
    find: '    if (tokens !== undefined) table.record(rule, result, tokens);',
    replace: '    if (tokens !== undefined) table.setText(rule, result);',
  },
  {
    name: 'assign a memo hit as a string, dropping its tokens',
    find: '    if (known.tokens !== undefined) table.record(rule, known.text, known.tokens);',
    replace:
      '    if (known.tokens !== undefined) table.setText(rule, known.text);',
  },
];

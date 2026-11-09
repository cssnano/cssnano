export const name = 'merge-links';

/**
 * @param {string} module
 * @return {string}
 */
function source(module) {
  return new URL(
    `../../../../../src/passes/merge/lib/rules/${module}`,
    import.meta.url
  ).href;
}

export const target = source('linkChecks.js');
// node --test expands this glob, so every split test file of the rules runs.
export const test = new URL(
  '../../../../../test/passes/merge/lib/rules/*.js',
  import.meta.url
).href;

// Each mutant restores an exception that the link checks no longer have. The
// fuzz oracles run without checks, so only the rules' tests judge these.
export const mutations = [
  {
    name: 'the reach check lets an entry linked nowhere pass again',
    target: source('linkChecks.js'),
    find: '  let at = index;\n',
    replace:
      '  if (records.links.parentOf(index) === -1) return;\n  let at = index;\n',
  },
  {
    name: 'linking into a rule that is linked nowhere passes again',
    target: source('linkChecks.js'),
    find: '  let at = block;\n',
    replace:
      '  if (records.links.parentOf(block) === -1 && records.container(block)?.context === -1) return;\n  let at = block;\n',
  },
];

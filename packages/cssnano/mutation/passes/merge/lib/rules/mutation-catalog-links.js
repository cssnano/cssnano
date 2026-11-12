export const name = 'merge-links';

/**
 * @param {string} module
 * @return {string}
 */
function irSource(module) {
  return new URL(`../../../../../src/passes/ir/${module}`, import.meta.url)
    .href;
}

export const target = irSource('linkChecks.js');
// node --test expands this glob, so every split test file of the rules runs.
export const test = new URL(
  '../../../../../test/passes/{merge/lib/rules,ir}/*.js',
  import.meta.url
).href;

// Each mutant is a link fault that leaves the output as it is: it restores an
// exception the link checks no longer have, or leaves an emptied entry linked.
// The fuzz oracles see neither, so only the rules' tests judge these.
export const mutations = [
  {
    name: 'the reach check lets an entry linked nowhere pass again',
    target: irSource('linkChecks.js'),
    find: '  let at = index;\n',
    replace:
      '  if (records.links.parentOf(index) === -1) return;\n  let at = index;\n',
  },
  {
    name: 'linking into a rule that is linked nowhere passes again',
    target: irSource('linkChecks.js'),
    find: '  let at = block;\n',
    replace:
      '  if (records.links.parentOf(block) === -1 && records.container(block)?.context === -1) return;\n  let at = block;\n',
  },
  {
    name: 'the link check lets an entry that stands in a chain pass again',
    target: irSource('linkChecks.js'),
    find: '  if (records.links.parentOf(index) !== -1) throw new Error(LINKED_TWICE);\n',
    replace: '',
  },
  {
    name: 'a takePlaceOf that leaves the later entry in its chain',
    target: irSource('treeEdits.js'),
    find: '  records.detach(later);\n',
    replace: '',
  },
];

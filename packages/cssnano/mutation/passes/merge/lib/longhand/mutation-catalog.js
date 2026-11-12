export const name = 'merge-longhand';
export const target = new URL(
  '../../../../../src/passes/merge/lib/longhand/decl/borderReducer.js',
  import.meta.url
).href;
// node --test expands this glob; a directory path would resolve to a single
// entry module instead of running every split test file.
export const test = new URL(
  '../../../../../test/passes/merge/lib/longhand/*.js',
  import.meta.url
).href;

export const mutations = [
  {
    name: 'mix !important declarations into the normal lane',
    find: `    const laneDecls = live.filter(
      (p) => Boolean(list.at(p).important) === lane && !list.at(p).removed
    );`,
    replace: '    const laneDecls = live.filter((p) => !list.at(p).removed);',
  },
  {
    name: 'let substituted values fill border cells without a barrier',
    find: '  const isBarrier = hasSubstitution(d.value, tokens);',
    replace: '  const isBarrier = false;',
  },
  {
    name: 'reduce segments containing style hacks',
    find: '    if (hasHack(d.before, d.prop, d.value) || !canExplode(d)) {',
    replace: '    if (!canExplode(d)) {',
  },
  {
    name: 'drop declarations a later one needs as a fallback',
    find: '    !strandsFallback(node, lastNode, features)\n  );',
    replace: '    true\n  );',
  },
];
